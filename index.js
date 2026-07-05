const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const { DisTube } = require("distube");

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
      option
        .setName("song")
        .setDescription("اكتب اسم الأغنية أو الرابط")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("skip")
    .setDescription("تخطي الأغنية"),

  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("إيقاف الموسيقى"),

  new SlashCommandBuilder()
    .setName("pause")
    .setDescription("إيقاف مؤقت"),

  new SlashCommandBuilder()
    .setName("resume")
    .setDescription("تكملة التشغيل"),

  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("عرض قائمة الانتظار"),

  new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("عرض الأغنية الحالية")
].map(command => command.toJSON());

client.once("ready", async () => {
  console.log(`${client.user.tag} is online!`);

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log("Slash commands registered!");
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

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

  try {
    if (interaction.commandName === "play") {
      const song = interaction.options.getString("song");

      await interaction.reply(`جاري تشغيل: **${song}**`);

      distube.play(voiceChannel, song, {
        textChannel: interaction.channel,
        member: interaction.member
      });
    }

    if (interaction.commandName === "skip") {
      distube.skip(interaction);
      await interaction.reply("تم تخطي الأغنية.");
    }

    if (interaction.commandName === "stop") {
      distube.stop(interaction);
      await interaction.reply("تم إيقاف الموسيقى.");
    }

    if (interaction.commandName === "pause") {
      distube.pause(interaction);
      await interaction.reply("تم إيقاف الأغنية مؤقتاً.");
    }

    if (interaction.commandName === "resume") {
      distube.resume(interaction);
      await interaction.reply("تمت متابعة التشغيل.");
    }

    if (interaction.commandName === "queue") {
      const queue = distube.getQueue(interaction);

      if (!queue) {
        return interaction.reply("ماكو أغاني في قائمة الانتظار.");
      }

      const songs = queue.songs
        .map((song, index) => `${index + 1}. ${song.name}`)
        .slice(0, 10)
        .join("\n");

      await interaction.reply(`**قائمة الانتظار:**\n${songs}`);
    }

    if (interaction.commandName === "nowplaying") {
      const queue = distube.getQueue(interaction);

      if (!queue) {
        return interaction.reply("ماكو أغنية تشتغل حالياً.");
      }

      await interaction.reply(`تشتغل الآن: **${queue.songs[0].name}**`);
    }
  } catch (error) {
    console.log(error);

    if (!interaction.replied) {
      await interaction.reply("صار خطأ أثناء تنفيذ الأمر.");
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

client.login(process.env.TOKEN);
