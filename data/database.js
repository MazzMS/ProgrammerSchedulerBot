import { DataTypes, Model, Sequelize } from "sequelize";

export const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
	host: process.env.DB_HOST,
	dialect: 'postgres',
	port: process.env.DB_PORT
});


class User extends Model { }
User.init({
	id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, },
	name: { type: DataTypes.STRING, allowNull: false },
	discord_id: { type: DataTypes.BIGINT, allowNull: false, unique: true },
}, { sequelize, modelName: 'User' });

class TaskType extends Model { }
TaskType.init({
	id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, },
	name: { type: DataTypes.STRING, allowNull: false, unique: true },
}, { sequelize, modelName: 'TaskType' });

export async function getTaskTypes() {
	try {
		const taskTypes = await sequelize.models.TaskType.findAll({
			attributes: ['id', 'name']
		});

		const taskTypesFormatted = taskTypes.map(taskType => ({
			name: taskType.getDataValue('name'),
			value: String(taskType.getDataValue('id'))
		}));

		return taskTypesFormatted
	} catch (err) {
		console.error('Error fetching task types:\n', err);
	}
}


class Task extends Model { }
Task.init({
	id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, },
	name: { type: DataTypes.STRING, allowNull: false },
	completed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
	taskTypeId: { type: DataTypes.INTEGER, references: { model: TaskType, key: 'id', }, },
	userId: { type: DataTypes.INTEGER, references: { model: User, key: 'id', }, },
	dueDate: { type: DataTypes.DATE, allowNull: false, },
}, { sequelize, modelName: 'Task' });

async function setupDatabase() {
	try {
		await sequelize.authenticate();
		console.log('Connection has been established succesfully.');

		await sequelize.sync({ alter: true });
		console.log('Succesfull sync');

		await sequelize.models.TaskType.bulkCreate(
			[{ name: 'Generic' }],
			{ ignoreDuplicates: true, },
		);
		console.log('Database setup complete')

	} catch (err) {
		console.error('There was an error:', err);
	}
}


// TaskType -> Task (one-to-many)
TaskType.hasMany(Task, { foreignKey: 'taskTypeId', sourceKey: 'id' });
Task.belongsTo(TaskType, { foreignKey: 'taskTypeId', targetKey: 'id' });

// User -> Task (one-to-many)
User.hasMany(Task, { foreignKey: 'userId', sourceKey: 'id'});
Task.belongsTo(User, { foreignKey: 'userId', targetKey: 'id'});

await setupDatabase()
