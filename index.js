require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();
const { Schema } = mongoose;


// Database Connection
mongoose.connect(process.env.MONGO_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Schemas

const userSchema = new Schema({
	username: String
});

const exerciseSchema = new Schema({
	userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	username: String,
	description: { type: String, required: true },
	duration: { type: Number, required: true },
	date: String,
});

// Models

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// EndPoints

app.post('/api/users', async (req, res) => {

	const user_name = req.body.username;

	try {

		const user = new User({ username: user_name });

		const userSaved = await user.save();

		res.json({ username: userSaved.username, _id: userSaved._id });

	} catch (error) {

		res.status(500).json({ message: err.message });

	}

});

app.get('/api/users', async (req, res) => {

	try {

		const users = await User.find({});

		res.json(users);

	} catch (error) {

		res.status(500).json({ message: error });
		console.log(error);

	}

});

app.post('/api/users/:_id/exercises', async (req, res) => {

	let exercise_date;
	const userId = req.params._id;
	const description = req.body.description;
	const duration = Number(req.body.duration);

	exercise_date = req.body.date;

	try {

		if (!exercise_date) {
			exercise_date = new Date();
		} else {
			exercise_date = new Date(exercise_date);
		}

		const userFound = await User.findById(userId);

		if (!userFound) {
			return res.status(404).json({ error: 'User Not Found' });
		}

		const newExercise = new Exercise({
			userId: userFound._id,
			username: userFound.username,
			description: description,
			duration: duration,
			date: exercise_date.toISOString().split('T')[0]
		});

		const exerciseSaved = await newExercise.save();

		return res.json({
			"username": exerciseSaved.username,
			"description": exerciseSaved.description,
			"duration": exerciseSaved.duration,
			"date": exercise_date.toDateString(),
			"_id": exerciseSaved.userId,
		});

	} catch (error) {

		res.status(500).json({ message: error.message })

	}

});

app.get('/api/users/:_id/logs', async (req, res) => {

	const userId = req.params._id;
	const { from, to, limit } = req.query;

	try {
		// Buscar el usuario por ID
		const userFound = await User.findById(userId);
		if (!userFound) {
			return res.status(404).json({ error: "User not found" });
		}

		// Crear una consulta base para los ejercicios
		let query = { userId };

		// Si se proporciona 'from' o 'to', agregar filtro de fechas
		if (from || to) {
			query.date = {};
			if (from) {
				// Asegurarse de que 'from' sea una fecha válida en formato yyyy-mm-dd
				const fromDate = new Date(from);
				if (!isNaN(fromDate)) {
					query.date.$gte = fromDate.toISOString().split('T')[0];;
					console.log(query.date.$gte)
				}
			}
			if (to) {
				// Asegurarse de que 'to' sea una fecha válida en formato yyyy-mm-dd
				const toDate = new Date(to);
				if (!isNaN(toDate)) {
					query.date.$lte = toDate.toISOString().split('T')[0];;
				}

			}
		}

		// Ejecutar la consulta con los filtros
		let exercisesFound = Exercise.find(query);

		// Aplicar el límite si está presente
		if (limit) {
			exercisesFound = exercisesFound.limit(Number(limit));
		}

		exercisesFound = await exercisesFound; // Ejecutar la consulta

		// Verificar si no se encontraron ejercicios
		if (exercisesFound.length === 0) {
			return res.json({
				username: userFound.username,
				count: 0,
				_id: userFound._id,
				log: []
			});
		}

		// Mapear los ejercicios para devolver el formato esperado
		const log = exercisesFound.map(exercise => ({
			description: exercise.description,
			duration: exercise.duration,
			date: new Date(exercise.date).toDateString()  // Convertir la fecha a formato legible
		}));

		// Enviar la respuesta con los ejercicios encontrados
		res.json({
			username: userFound.username,
			count: log.length,
			_id: userFound._id,
			log
		});

	} catch (error) {
		// Manejo de errores
		res.status(500).json({ message: error.message });
	}
});

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log('Your app is listening on port ' + listener.address().port)
})
