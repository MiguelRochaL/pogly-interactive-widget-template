export const cleanTwitchMessage = (message: string) => {
  // Twitch has anti spam mechanism that prevents you from sending 2 identical messages back to back.
  // 7TV has a feature where it adds a random space into the message to get around the spam filter.
  // This just gets rid of that space so if your widget relies on users writing the same message twice in a row, the second message wont be ignored.

  let cleanMessage = message;

  if (/[\u0020\uDBC0]/.test(cleanMessage)) {
    cleanMessage = cleanMessage.slice(0, -2);
  }

  return cleanMessage;
};

export const cleanKickMessage = (message: string) => {
  let cleanMessage = message;

  if (/[\uDB40\uDC00-\uDC7F]/.test(message)) {
    message = message.replace(/\uDB40[\uDC00-\uDC7F]/g, "").trimEnd();
  }

  return cleanMessage;
};
