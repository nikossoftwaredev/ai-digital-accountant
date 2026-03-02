import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../utils/logger";

let client: Anthropic | null = null;

export const getAnthropicClient = (): Anthropic => {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    client = new Anthropic();
    logger.info("Anthropic client initialized");
  }
  return client;
};
