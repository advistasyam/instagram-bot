import { IgApiClient } from 'instagram-private-api';
import fs from 'fs';
import { checkForNewFollowersAndSendMessage } from "./function/checkForNewFollowersAndSendMessage.js";
import dotenv from "dotenv";

// read .env file
dotenv.config();

const username = process.env.IG_USERNAME
const password = process.env.IG_PASSWORD

let savedState;
try {
  savedState = JSON.parse(fs.readFileSync('followers.json', 'utf8'));
} catch (err) {
  console.log('No previous state found');
}

const ig = new IgApiClient();

ig.state.generateDevice(username);

(async () => {
  await ig.account.login(username, password);
  console.log("account logged in");

  if (!savedState) {
    // initiate followers.json
    console.log("initiating followers.json");
    const accountDetails = await ig.account.currentUser();
    const followers = await ig.feed.accountFollowers(accountDetails.pk).items();
    savedState = { followers: followers.map(follower => follower.pk) };
    fs.writeFileSync('followers.json', JSON.stringify(savedState));

    console.log("followers.json created and ready to used");
  }

  await ig.state.deserialize(savedState);

  // Check for new followers every minute
  setInterval(function() {
    checkForNewFollowersAndSendMessage(ig, savedState)
  }, 60 * 1000);

  // initial check for new followers when the script starts
  await checkForNewFollowersAndSendMessage(ig, savedState);

})();
