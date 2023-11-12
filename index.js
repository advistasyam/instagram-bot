import {IgApiClient, IgLoginTwoFactorRequiredError} from 'instagram-private-api';
import fs from 'fs';
import dotenv from "dotenv";
import Bluebird from "bluebird";

dotenv.config();

const username = process.env.IG_USERNAME
const password = process.env.IG_PASSWORD
const message = process.env.MESSAGE

let savedState;
try {
  savedState = JSON.parse(fs.readFileSync('followers.json', 'utf8'));
} catch (err) {
  console.log('No previous state found');
}

const ig = new IgApiClient();

ig.state.generateDevice(username);

async function sleep(millisecond) {
  return new Promise(resolve => setTimeout(resolve, millisecond));
}

function reloadEnv() {
  try {
    const data = fs.readFileSync('.env', 'utf8');
    const envConfig = dotenv.parse(data);
    for (const key in envConfig) {
      process.env[key] = envConfig[key];
    }
    console.log('.env file has been reloaded.');
  } catch (error) {
    console.error('Error reloading .env file:', error);
  }
}

async function login() {
  console.log("trying to login")

  // If 2FA is enabled, IgLoginTwoFactorRequiredError will be thrown
  return Bluebird.try(() => ig.account.login(username, password)).catch(
      IgLoginTwoFactorRequiredError,
      async err => {
        const {username, totp_two_factor_on, two_factor_identifier} = err.response.body.two_factor_info;

        console.log(err.response.body);

        const verificationMethod = totp_two_factor_on ? '0' : '1'; // '1' = SMS (default), '0' = TOTP (google auth for example)

        console.log("change .env now")
        await sleep(10000)
        reloadEnv();

        const code = process.env.CODE
        return ig.account.twoFactorLogin({
          username,
          verificationCode: code,
          twoFactorIdentifier: two_factor_identifier,
          verificationMethod,
          trustThisDevice: '1',
        });
      },
  ).catch(e => console.error('An error occurred while processing two factor auth', e, e.stack));
}

(async () => {
  if (savedState) {
    await ig.state.deserialize(savedState);
  }

  await login();
  console.log("account logged in");

  const accountDetails = await ig.account.currentUser();
  const accountId = accountDetails.pk;

  async function populateFollowersJson() {
    try {
      const followers = await ig.feed.accountFollowers(accountId).items();
      savedState = { followers: followers.map(follower => follower.pk) };
      fs.writeFileSync('followers.json', JSON.stringify(savedState));

      console.log("followers json populated");
    } catch {
      console.error(`Error occurred when populate followers json : ${error}`);
    }
  }

  async function sendMessageToUser(userId, message) {
    try {
      const thread = ig.entity.directThread([userId.toString()]);
      await thread.broadcastText(message);
      console.log(`Message sent successfully to user with ID ${userId}`);
    } catch (error) {
      console.error(`Failed to send message to user with ID ${userId}: ${error}`);
    }
  }

  async function checkForNewFollowersAndSendMessage() {
    try {
      const followers = await ig.feed.accountFollowers(accountId).items();

      if (savedState && savedState.followers) {
        const newFollowers = followers.filter(follower => !savedState.followers.includes(follower.pk));
        for (const follower of newFollowers) {
          await sendMessageToUser(follower.pk, message);
        }
      }

      savedState = { followers: followers.map(follower => follower.pk) };
      fs.writeFileSync('followers.json', JSON.stringify(savedState));

    } catch (error) {
      console.error(`Error occurred: ${error}`);
    }
  }

  // populate followers json
  await populateFollowersJson();

  console.log("application ready to listen to new followers");

  // Check for new followers every minute
  setInterval(checkForNewFollowersAndSendMessage, 60 * 1000);

})();
