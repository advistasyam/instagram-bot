import { IgApiClient } from 'instagram-private-api';
import fs from 'fs';
import dotenv from "dotenv";

// read .env file
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

(async () => {
  // Restore previous state if available
  if (savedState) {
    await ig.state.deserialize(savedState);
  }

  await ig.account.login(username, password);
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
