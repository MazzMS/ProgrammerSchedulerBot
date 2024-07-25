import { SlashCommandBuilder } from "discord.js";


export const data = new SlashCommandBuilder()
	.setName('today')
	.setDescription('Return today schedules activities')

export async function execute(interaction){
	await interaction.reply('Not implemented yet.');
}
