import { Bot, InlineKeyboard, webhookCallback, InlineQueryResultBuilder } from "grammy";
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

// bot.callbackQuery("effect-s", async (ctx) => {
//   await ctx.answerCallbackQuery({
//     text: "You were curious, indeed!"
//   });
// });
// Pass further options to the result.
// const keyboard = new InlineKeyboard()
//   .text("Aw yis", "call me back");
// InlineQueryResultBuilder.article("id-3", "Hit me", { reply_markup: keyboard })
//   .text("Push my buttons");

bot.inlineQuery("effect-s", async (ctx) => {
  // Create a single inline query result.
  const result = InlineQueryResultBuilder
    .article("id:grammy-website", "grammY", {
      reply_markup: new InlineKeyboard()
        .url("grammY website", "https://grammy.dev/"),
    })
    .text(
      `<b>grammY</b> is the best way to create your own Telegram bots.
They even have a pretty website! 👇`,
      // { parse_mode: "HTML" },
    );

  // Answer the inline query.
  await ctx.answerInlineQuery(
    [result], // answer with result list
    { cache_time: 30 * 24 * 3600 }, // 30 days in seconds
  );
});

// Return empty result list for other queries.
bot.on("inline_query", (ctx) => ctx.answerInlineQuery([]));

// bot.on("callback_query:data", async (ctx) => {
//   console.log("Unknown button event with payload", ctx.callbackQuery.data);
//   await ctx.answerCallbackQuery(); // remove loading animation
// });

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
// bot.on("message", replyWithIntro);
bot.on("message", msg => {
  console.log("msg=>", msg);
  debugger
});

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
