import { quote, SlashCommandBuilder, time, TimestampStyles } from "discord.js";
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
			if (subcommand === 'due') {
				await getTasks(
					interaction,
					interaction.options.getBoolean('order', false),
					30,
					false
				)
			}
			if (subcommand === 'today') {
				await getTasks(interaction)
			}
		}
	} else {
		await addTask(interaction)
	}
}

async function getTasks(interaction, sort = false, days = 0, showCompleted = true) {
	const user = await checkUser(interaction.user);
	const today = new Date();
	const dueDate = new Date();
	dueDate.setHours(0, 0, 0, 0);
	today.setHours(0, 0, 0, 0);
	dueDate.setDate(dueDate.getDate() - days);


	const order = sort ? 'DESC' : 'ASC';

	const whereClause = {
		userId: user.id,
		dueDate: {
			[Op.and]: {
				[Op.gte]: dueDate,
				[Op.lte]: today
			}
		}
	}

	// If only show uncompleted tasks, filter by ´completed: false´
	if (!showCompleted) {
		whereClause['completed'] = false
	}

	try {
		const tasks = await sequelize.models.Task.findAll({
			where: whereClause,
			order: [['dueDate', order]],
			limit: 20
		})

		if (tasks.length === 0) {
			await interaction.reply('You have no pending tasks.');
			return;
		}

		await interaction.reply('# Here are your pending tasks:');

		for (const task of tasks) {
			const dateString = time(task.dueDate, TimestampStyles.RelativeTime)
			await interaction.channel.send({
				content: `## ${task.name}\nDue on: ${dateString}`,
			});
		}
	} catch (err) {
		console.error('Error listing tasks:', err);
		await interaction.reply('An error occurred while listing your tasks.');
	}

}

async function addTask(interaction) {
	// User data
	const user = await checkUser(interaction.user);

	// Task data
	const taskType = interaction.options.getString('task_type');
	const taskName = interaction.options.getString('task_name');
	const days = interaction.options.getNumber('due_in');
	console.log('Days:', days);
	const dueDate = new Date();
	dueDate.setHours(0, 0, 0, 0);
	dueDate.setDate(dueDate.getDate() + days);

	// Add task
	const task = await sequelize.models.Task.create({
		name: taskName,
		userId: user.id,
		taskTypeId: taskType,
		dueDate: dueDate,
	})

	interaction.reply(`You have added this task: ${task.name}`)
}

async function checkUser(user) {
	// User data
	const name = user.username;
	const id = user.id;

	const [userRegistered, created] = await sequelize.models.User.findOrCreate({
		where: { discord_id: id, name: name }
	})

	if (!created) {
		console.log(`A new user named ${name}${id} was added to the database.`)
	}

	return userRegistered
}
