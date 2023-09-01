const {
  Client,
  Constants,
  CommandInteraction,
  AutocompleteInteraction
} = require("@projectdysnomia/dysnomia");
const fs = require("fs");

const config = JSON.parse(fs.readFileSync("config.json", "utf8"));

const bot = new Client(`Bot ${config.token}`, {
  gateway: {
    intents: ["messageContent"]
  },
  restMode: true
});

const commands = [
  {
    name: "faq",
    description: "Hotlink to the FAQ",
    type: Constants.ApplicationCommandTypes.CHAT_INPUT,
    autocomplete: true,
    options: [
      {
        name: "header",
        description: "The header from the FAQ",
        type: Constants.ApplicationCommandOptionTypes.STRING,
        autocomplete: true,
        required: true
      }
    ]
  }
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const faq = [];
async function fillFAQ() {
  const channel = await bot.getRESTChannel(config.faqChannel);
  let before = undefined;

  while (true) {
    console.log(`Filling FAQ... (count=${faq.length} before=${before})`);
    const messages = await channel.getMessages({
      before
    });

    if (messages.length === 0) {
      console.log("Done!");
      break;
    }

    for (const message of messages) {
      //console.log(message.content);

      const lines = message.content.split("\n");
      const header = lines
        .find((l) => l.startsWith("#"))
        .replace("#", "")
        .trim();

      const otherLines = lines.filter(
        (l) => !l.startsWith("#") && l.trim() !== ""
      );
      const content = otherLines.join("\n");

      const url = `https://discord.com/channels/${config.guild}/${config.faqChannel}/${message.id}`;
      const entry = { header, content, url };
      faq.push(entry);
      //console.log(entry);
    }

    const earliest = messages.sort((a, b) => a.timestamp - b.timestamp)[0];
    before = earliest.id;

    await sleep(5000);
  }
}

bot.on("ready", async () => {
  await fillFAQ();

  for (const command of commands) {
    await bot.createGuildCommand(config.guild, command);
  }
});

bot.on("interactionCreate", async (interaction) => {
  if (interaction instanceof AutocompleteInteraction) {
    switch (interaction.data.name) {
      case "faq": {
        const query = interaction.data.options[0].value;

        const results = faq
          .filter((e) => e.header.includes(query))
          .map((e) => {
            return { name: e.header, value: e.header };
          });

        await interaction.acknowledge(results);
      }
    }
  }

  if (interaction instanceof CommandInteraction) {
    switch (interaction.data.name) {
      case "faq": {
        const header = interaction.data.options[0].value;
        const entry = faq.find((e) => e.header === header);
        if (!entry) {
          await interaction.createMessage("No FAQ entry found.");
        } else {
          await interaction.createMessage(`# ${header}\n\n${entry.url}`);
        }
        break;
      }
    }
  }
});

bot.connect();
