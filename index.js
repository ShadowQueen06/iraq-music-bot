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

const commands = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("تشغيل أغنية")
    .addStringOption(option =>
      option.setName("song")
        .setDescription("اسم الأغنية أو الرابط")
        .setRequired(true)
    ),

  new SlashCommandBuilder().setName("skip").setDescription("تخطي الأغنية"),
  new SlashCommandBuilder().setName("stop").setDescription("إيقاف الموسيقى"),
  new SlashCommandBuilder().setName("pause").setDescription("إيقاف مؤقت"),
  new SlashCommandBuilder().setName("resume").setDescription("تكملة التشغيل"),
  new SlashCommandBuilder().setName("queue").setDescription("قائمة الانتظار"),
  new SlashCommandBuilder().setName("nowplaying").setDescription("الأغنية الحالية")
].map(command => command.toJSON());

client.once("ready", async () => {
  console.log(`${client.user.tag} is online!`);

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log("Slash commands registered!");
  
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {
    const voiceChannel = interaction.member.voice.channel;

    if (
      ["play", "skip", "stop", "pause", "resume"].includes(interaction.commandName)
      && !voiceChannel
    ) {
      return interaction.reply({
        content: "لازم تدخل روم صوتي أولاً.",
        ephemeral: true
      });
    }

    if (interaction.commandName === "play") {
      await interaction.deferReply();

      const song = interaction.options.getString("song");

      await distube.play(voiceChannel, song, {
        textChannel: interaction.channel,
        member: interaction.member
      });

      return interaction.editReply(`جاري تشغيل: **${song}**`);
    }

    if (interaction.commandName === "skip") {
      await distube.skip(interaction.guild);
      return interaction.reply("تم تخطي الأغنية.");
    }

    if (interaction.commandName === "stop") {
      await distube.stop(interaction.guild);
      return interaction.reply("تم إيقاف الموسيقى.");
    }

    if (interaction.commandName === "pause") {
      await distube.pause(interaction.guild);
      return interaction.reply("تم إيقاف الأغنية مؤقتاً.");
    }

    if (interaction.commandName === "resume") {
      await distube.resume(interaction.guild);
      return interaction.reply("تمت متابعة التشغيل.");
    }

    if (interaction.commandName === "queue") {
      const queue = distube.getQueue(interaction.guild);

      if (!queue) return interaction.reply("ماكو أغاني في القائمة.");

      const list = queue.songs
        .map((song, i) => `${i + 1}. ${song.name}`)
        .slice(0, 10)
        .join("\n");

      return interaction.reply(`**قائمة الانتظار:**\n${list}`);
    }

    if (interaction.commandName === "nowplaying") {
      const queue = distube.getQueue(interaction.guild);

      if (!queue) return interaction.reply("ماكو أغنية تشتغل حالياً.");

      return interaction.reply(`تشتغل الآن: **${queue.songs[0].name}**`);
    }
  } catch (error) {
    console.log(error);

    if (interaction.deferred) {
      return interaction.editReply("صار خطأ أثناء تشغيل الأمر.");
    }

    if (!interaction.replied) {
      return interaction.reply({
        content: "صار خطأ أثناء تشغيل الأمر.",
        ephemeral: true
      });
    }
  }
});

distube.on("playSong", (queue, song) => {
  queue.textChannel.send(`بدأ التشغيل: **${song.name}**`);
});

distube.on("addSong", (queue, song) => {
  queue.textChannel.send(`تمت إضافة الأغنية: **${song.name}**`);
});

distube.on("error", (channel, error) => {
  console.log(error);

  if (channel) {
    channel.send("صار خطأ في تشغيل الأغنية.");
  }
});

client.login(TOKEN);
