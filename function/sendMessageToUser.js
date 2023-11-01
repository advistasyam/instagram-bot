async function sendMessageToUser(ig, userId, message) {
  try {
    const thread = ig.entity.directThread([userId.toString()]);
    await thread.broadcastText(message);
    console.log(`Message sent successfully to user with ID ${userId}: ${message}`);
  } catch (error) {
    console.error(`Failed to send message to user with ID ${userId}: ${error}`);
  }
}

export { sendMessageToUser }