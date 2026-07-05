const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const { DisTube } = require("distube");

const TOKEN = process.env.TOKEN;

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
        .setDescription("اسم الأغنية أو الرابط")
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
    .setDescription("قائمة الانتظار"),

  new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("الأغنية الحالية")
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

  if (interaction.replied || interaction.deferred) return;

  try {
    if (interaction.commandName === "play") {
      await interaction.deferReply();

      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.editReply("لازم تدخل روم صوتي أولاً.");
      }

      const song = interaction.options.getString("song");

      await distube.play(voiceChannel, song, {
        textChannel: interaction.channel,
        member: interaction.member
      });

      return interaction.editReply(`جاري تشغيل: **${song}**`);
    }

    if (interaction.commandName === "skip") {
      await interaction.deferReply();
      await distube.skip(interaction.guild);
      return interaction.editReply("تم تخطي الأغنية.");
    }

    if (interaction.commandName === "stop") {
      await interaction.deferReply();
      await distube.stop(interaction.guild);
      return interaction.editReply("تم إيقاف الموسيقى.");
    }

    if (interaction.commandName === "pause") {
      await interaction.deferReply();
      await distube.pause(interaction.guild);
      return interaction.editReply("تم إيقاف الأغنية مؤقتاً.");
    }

    if (interaction.commandName === "resume") {
      await interaction.deferReply();
      await distube.resume(interaction.guild);
      return interaction.editReply("تمت متابعة التشغيل.");
    }

    if (interaction.commandName === "queue") {
      await interaction.deferReply();

      const queue = distube.getQueue(interaction.guild);

      if (!queue) {
        return interaction.editReply("ماكو أغاني في القائمة.");
      }

      const list = queue.songs
        .map((song, i) => `${i + 1}. ${song.name}`)
        .slice(0, 10)
        .join("\n");

      return interaction.editReply(`**قائمة الانتظار:**\n${list}`);
    }

    if (interaction.commandName === "nowplaying") {
      await interaction.deferReply();

      const queue = distube.getQueue(interaction.guild);

      if (!queue) {
        return interaction.editReply("ماكو أغنية تشتغل حالياً.");
      }

      return interaction.editReply(`تشتغل الآن: **${queue.songs[0].name}**`);
    }
  } catch (error) {
    console.log(error);

    try {
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply("صار خطأ أثناء تشغيل الأمر.");
      }

      return interaction.reply("صار خطأ أثناء تشغيل الأمر.");
    } catch {}
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
