const { IgApiClient } = require('instagram-private-api');
const fs = require('fs');
require('dotenv').config();

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
ig.state.proxyUrl = process.env.IG_PROXY; // Use a proxy if needed

(async () => {
  if (savedState) {
    await ig.state.deserialize(savedState);
  }

  await ig.account.login(username, password);

  async function sendMessageToUser(userId, message) {
    try {
      const thread = ig.entity.directThread([userId.toString()]);
      await thread.broadcastText(message);
      console.log(`Message sent successfully to user with ID ${userId}: ${message}`);
    } catch (error) {
      console.error(`Failed to send message to user with ID ${userId}: ${error}`);
    }
  }

  async function checkForNewFollowersAndSendMessage() {
    try {
      const accountDetails = await ig.account.currentUser();
      const followers = await ig.feed.accountFollowers(accountDetails.pk).items();

      if (savedState && savedState.followers) {
        const newFollowers = followers.filter(follower => !savedState.followers.includes(follower.pk));
        for (const follower of newFollowers) {
          await sendMessageToUser(follower.pk, 'Thank you for following! This is an automated message.');
        }
      }

      savedState = { followers: followers.map(follower => follower.pk) };
      fs.writeFileSync('followers.json', JSON.stringify(savedState));

    } catch (error) {
      console.error(`Error occurred: ${error}`);
    }
  }

  // Check for new followers every minute
  setInterval(checkForNewFollowersAndSendMessage, 60 * 1000);

  // initial check for new followers when the script starts
  await checkForNewFollowersAndSendMessage();

})();
