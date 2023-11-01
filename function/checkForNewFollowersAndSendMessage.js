import fs from "fs";
import { sendMessageToUser } from "./sendMessageToUser.js";

async function checkForNewFollowersAndSendMessage(ig, savedState) {
  try {
    const accountDetails = await ig.account.currentUser();
    const followers = await ig.feed.accountFollowers(accountDetails.pk).items();

    if (savedState && savedState.followers) {
      const newFollowers = followers.filter(follower => !savedState.followers.includes(follower.pk));
      for (const follower of newFollowers) {
        await sendMessageToUser(ig, follower.pk, 'Thank you for following! This is an automated message.');
      }
    }

    savedState = { followers: followers.map(follower => follower.pk) };
    fs.writeFileSync('followers.json', JSON.stringify(savedState));

  } catch (error) {
    console.error(`Error occurred: ${error}`);
  }
}

export { checkForNewFollowersAndSendMessage }