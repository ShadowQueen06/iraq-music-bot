const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const { joinVoiceChannel } = require("@discordjs/voice");
const { DisTube } = require("distube");

const TOKEN = process.env.TOKEN;
const VOICE_CHANNEL_ID = "1523440933046321323";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const distube = new DisTube(client, {
  emitNewSongOnly: true
});

client.once("ready", async () => {
  console.log(`${client.user.tag} is online!`);

  const channel = await client.channels.fetch(VOICE_CHANNEL_ID);

  if (channel && channel.isVoiceBased()) {
    joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false
    });

    console.log("Bot joined the voice channel 24/7");
  }
});

client.login(TOKEN);
