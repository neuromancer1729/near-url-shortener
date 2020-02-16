// @nearfile

import { context, PersistentVector } from "near-runtime-ts";

import { PostedMessage, PostedUrls } from "./model";

// --- contract code goes below

// The maximum number of latest messages the contract returns.
const MESSAGE_LIMIT = 10;

// collections.vector is a persistent collection. Any changes to it will
// be automatically saved in the storage.
// The parameter to the constructor needs to be unique across a single contract.
// It will be used as a prefix to all keys required to store data in the storage.
const messages = new PersistentVector<PostedMessage>("m");
const urls = new PersistentVector<PostedUrls>("m");

// Adds a new message under the name of the sender's account id.
// NOTE: This is a change method. Which means it will modify the state.
// But right now we don't distinguish them with annotations yet.
export function addMessage(text: string): void {
  // Creating a new message and populating fields with our data
  const message: PostedMessage = {
    sender: context.sender,
    text: text
  };
  // Adding the message to end of the the persistent collection
  messages.push(message);
}

export function shortenURL(longURL: string): void {
  const numUrls = urls.length;

  const url: PostedUrls = {
    sender: context.sender,
    longURL: longURL,
    uid: numUrls
  };
  urls.push(url);
}

// Returns an array of last N messages.
// NOTE: This is a view method. Which means it should NOT modify the state.
export function getMessages(): PostedMessage[] {
  const numMessages = min(MESSAGE_LIMIT, messages.length);
  const startIndex = messages.length - numMessages;
  const result = new Array<PostedMessage>(numMessages);
  for (let i = 0; i < numMessages; i++) {
    result[i] = messages[i + startIndex];
  }
  return result;
}

export function getUrls(): PostedUrls[] {
  const numUrls = min(MESSAGE_LIMIT, urls.length);
  const startIndex = messages.length - numUrls;
  const result = new Array<PostedUrls>(numUrls);
  for (let i = 0; i < numUrls; i++) {
    result[i] = urls[i + startIndex];
  }
  return result;
}

export function findURL(uid : i32): string {
  const numUrls = urls.length;
  var result = urls[0];
  for (let i = 0; i < numUrls; i++) {
    if (urls[i].uid == uid){
      result = urls[i];
    }
  }
  return result.longURL;
}

