import { readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'bun';
import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import { sequelize } from '../data/database';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(path.dirname(__filename)); // First dirname gets 'core' directory

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.commands = new Collection();

async function loadCommands() {
	const foldersPath = path.join(__dirname, 'commands');
	const commandsFolders = await readdir(foldersPath);

	for (const folder of commandsFolders) {
		const commandsPath = path.join(foldersPath, folder);
		const commandFiles = (await readdir(commandsPath)).filter(file => file.endsWith('.js'));

		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			const command = await import(filePath);

			if ('data' in command && 'execute' in command) {
				client.commands.set(command.data.name, command);
			} else {
				console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
			}
		}
	}
}

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}
	try {
		await command.execute(interaction);
	} catch (err) {
		console.error(err);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		}
		else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true })
		}
	}
});



loadCommands().then(() => {
	client.login(process.env.DISCORD_TOKEN);
}).catch(console.error);
