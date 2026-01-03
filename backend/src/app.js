import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import e from 'express';

const app = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));



//Routes Here
import userRouter from './routes/user.routes.js';


app.use('/api/user', userRouter);

export default app;