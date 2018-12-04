import Telegraf from 'telegraf';
import { Users, UsersInstance, BotUsers, CommentsInstance } from './db';

const HOST = process.env.HOST || "https://glsbox.herokuapp.com";

export const Bot = process.env.BOT_TOKEN ? new Telegraf(process.env.BOT_TOKEN) : null;

if (Bot) {
    Bot.command("start", async ctx => {
        try {
            if (ctx.message && ctx.message.from && ctx.chat) {
                if (!ctx.message.from.username) {
                    ctx.reply("Telegram username is required to use this bot");
                    return;
                }

                const users = await Users.findAll({ where: { telegram: ctx.message.from.username } });
                if (users.length === 0) {
                    ctx.reply("This telegram account is not assigned to any GLSBox users");
                    return;
                }

                await BotUsers.create({
                    telegramUsername: ctx.message.from.username,
                    telegramUserId: ctx.message.from.id,
                    chat: ctx.chat.id,
                });

                const userLinks = users
                    .map(user => `[${user.username}](${HOST}/users/${user.id})`)
                    .join(", ");

                await ctx.replyWithMarkdown(`You will now receive updates for ${userLinks}`);
                ctx.replyWithMarkdown("Enter /stop to stop receiving updates");
            }
        } catch (e) {
            console.error(e);
            ctx.reply("Internal error");
        }
    });

    Bot.command("stop", async ctx => {
        try {
            if (ctx.message && ctx.message.from) {
                await BotUsers.destroy({ where: { telegramUserId: ctx.message.from.id } });
                ctx.reply("This account will no longer receive updates");
            }
        } catch (e) {
            console.error(e);
            ctx.reply("Internal error");
        }
    });

    Bot.startPolling();
} else {
    console.error("No bot token provided");
}

export module Notify {
    export async function comment(parentOwner: UsersInstance, replyOwner: UsersInstance, comment: CommentsInstance) {
        if (Bot && parentOwner.telegram) {
            const tg = await BotUsers.findOne({ where: { telegramUsername: parentOwner.telegram } });
            if (tg) {
                Bot.telegram.sendMessage(
                    tg.chat,
                    `User [${replyOwner.username}](${HOST}/users/${replyOwner.id}) left a [reply](${HOST}/view/${comment.parentShader}?comment=${comment.id}) to your [comment](${HOST}/view/${comment.parentShader}?comment=${comment.parentComment})`,
                    { parse_mode: "Markdown" } as any,
                );
            }
        }
    }
}
