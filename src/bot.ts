import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import { chunk } from "lodash";
import express from "express";

// Create a bot using the Telegram token
const bot = new Bot(process.env.TELEGRAM_TOKEN || "6350974456:AAE9tmLwr1KIDFGlmo-li9pbv9QzmzMqL20");

type Variant = "s" | "w" | "t" | "a" | "r";

// Handle the /you command to greet the user
bot.command("you", (ctx) => ctx.reply(`You ${ctx.from?.username}`));

// Handle the /start command to open the control panel using an inline keyboard
type Effect = { code: Variant; label: string };
const allEffects: Effect[] = [
  {
    code: "s",
    label: "Settings",
  },
  {
    code: "w",
    label: "Wallets",
  },
  {
    code: "t",
    label: "Buy/Sell",
  },
  {
    code: "a",
    label: "Approve",
  },
  {
    code: "r",
    label: "Refund",
  },
];

const effectCallbackCodeAccessor = (effectCode: Variant) =>
  `effect-${effectCode}`;

const effectsKeyboardAccessor = (effectCodes: string[]) => {
  const effectsAccessor = (effectCodes: string[]) =>
    effectCodes.map((code) =>
      allEffects.find((effect) => effect.code === code)
    );
  const effects = effectsAccessor(effectCodes);

  const keyboard = new InlineKeyboard();
  const chunkedEffects = chunk(effects, 1);
  for (const effectsChunk of chunkedEffects) {
    for (const effect of effectsChunk) {
      effect &&
        keyboard.text(effect.label, effectCallbackCodeAccessor(effect.code));
    }
    keyboard.row();
  }

  console.log(keyboard);
  return keyboard;
};

const textEffectResponseAccessor = (
  originalText: string,
  modifiedText?: string
) =>
  `Some Descriptions: ${originalText}` +
  (modifiedText ? `\nModified: ${modifiedText}` : "");

bot.command("start", (ctx) =>
  ctx.reply(textEffectResponseAccessor(ctx.match), {
    reply_markup: effectsKeyboardAccessor(
      allEffects.map((effect) => effect.code)
    ),
  })
);

// Return empty result list for other queries.
bot.on("inline_query", (ctx) => ctx.answerInlineQuery([]));

// Handle text effects from the effect keyboard

// Handle the /about command
const aboutUrlKeyboard = new InlineKeyboard().url(
  "Host your own bot for free.",
  "https://grammy.dev/"
);

// Suggest commands in the menu
bot.api.setMyCommands([
  { command: "you", description: "Be greeted by the bot" },
  {
    command: "start",
    description: "Opens the control panel",
  },
]);

// Handle all other messages and the /start command
const introductionMessage = `Hello! I'm a Telegram bot.
I'm powered by Cyclic, the next-generation serverless computing platform.

<b>Commands</b>
/you - Be greeted by me
/start - Opens the control panel`;

const replyWithIntro = (ctx: any) =>
  ctx.reply(introductionMessage, {
    reply_markup: aboutUrlKeyboard,
    parse_mode: "HTML",
  });

bot.command("hello", replyWithIntro);
bot.on("message", replyWithIntro);

// Start the server
if (process.env.NODE_ENV === "production") {
  // Use Webhooks for the production server
  const app = express();
  app.use(express.json());
  app.use(webhookCallback(bot, "express"));

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Bot listening on port ${PORT}`);
  });
} else {
  // Use Long Polling for development
  bot.start();
}
