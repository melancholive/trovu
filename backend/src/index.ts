import "./env";
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import usersRouter from './routes/users';
import authRoutes from "./routes/auth";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Trovu API is running' });
});

app.use('/users', usersRouter);

app.listen(port, () => {
  console.log(`Trovu backend listening on port ${port}`);
});