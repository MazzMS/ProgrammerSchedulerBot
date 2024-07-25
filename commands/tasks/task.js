import { SlashCommandBuilder } from "discord.js";
import { getTaskTypes, sequelize } from "../../data/database";
import { Op } from "sequelize";

async function createCommand() {
	const taskTypeChoices = await getTaskTypes(sequelize);

	const formattedChoices = taskTypeChoices.map(type => ({
		name: type.name,  // Display name for the user
		value: type.value, // Value to be returned in the interaction
	}));

	console.log(`Task types: `, formattedChoices)

	return new SlashCommandBuilder()
		.setName('task')
		.setDescription('Manage your tasks!')
		.addSubcommand(subcommand =>
			subcommand
				.setName('add')
				.setDescription('Add a task')
				.addStringOption(option =>
					option.setName('task_name')
						.setDescription('The task to be scheduled')
						.setRequired(true)
				)
				.addStringOption(option =>
					option.setName('task_type')
						.setDescription('The type of task')
						.setRequired(true)
						.addChoices(...formattedChoices)
				)
				.addNumberOption(option =>
					option.setName('due_in')
						.setDescription('In how many days will be due')
						.setRequired(true)
						.setMaxValue(365)
				)
		)
		.addSubcommandGroup(subcommandGroup =>
			subcommandGroup
				.setName('get')
				.setDescription('See your tasks')
				.addSubcommand(subcommand =>
					subcommand.setName('due')
						.setDescription('All (up to 20) your pending tasks from a month ago')
						.addBooleanOption(option =>
							option.setName('order')
								.setDescription('True for order by most due and false for least due')
						)
				)
				.addSubcommand(subcommand =>
					subcommand.setName('today')
						.setDescription('All your tasks for today')
				)
		);
}

export const data = await createCommand();

export async function execute(interaction) {
	const subcommandGroup = interaction.options.getSubcommandGroup(false);
	// set to false to make sure it returns null if command doesn't belong to any group
	const subcommand = interaction.options.getSubcommand()

	if (subcommandGroup) {
		if (subcommandGroup === 'get') {
			if (subcommand === 'due'){
				await getTasks(
					interaction,
					interaction.options.getBoolean('order', false),
					30,
					false
				)
			}
			if (subcommand === 'today'){
				await getTasks(interaction)
			}
		}
	} else {
		await addTasks(interaction)
	}
}

async function getTasks(interaction, sort=false, days=0, showCompleted=true){
	const user = await checkUser(interaction.user);
	const dueDate = new Date()
	dueDate.setDate(dueDate.getDate() - days)


	const whereClause = {
		where: {
			userId: user.id,
			dueDate: { [Op.gte]: dueDate }
		}
	}
	if (showCompleted){
		whereClause['completed'] = !showCompleted
	}
	const tasks = sequelize.models.Task.findAll({ 
		whereClause,
	})

}

async function addTasks(interaction){
	// User data
	const user = await checkUser(interaction.user);

	// Task data
	const taskType = interaction.options.getString('task_type')
	const taskName = interaction.options.getString('task_name')
	const days = interaction.options.getNumber('due')
	const dueDate = new Date()
	dueDate.setDate(dueDate.getDate() + days)

	// Add task
	const task = await sequelize.models.Task.create({
		name: taskName,
		userId: user.id,
		taskTypeId: taskType,
		dueDate: dueDate,
	})

	interaction.reply(`You have added this task: ${task.name}`)
}

async function checkUser(user){
	// User data
	const name = user.username;
	const id = user.id;

	const [user, created] = await sequelize.models.User.findOrCreate({
		where: { discord_id: id, name: name }
	})

	if (!created) {
		console.log(`A new user named ${name} was added to the database.`)
	}

	return user
}
