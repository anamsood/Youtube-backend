import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser"; //taki hmare server se jo user ka browser h uski cookies access and set kr sake

const app = express();

app.use(
	cors({
		origin: process.env.CORS_ORIGIN,
		credentials: true,
	})
);

app.use(express.json({ limit: "16kb" })); //kitna data as json bhejna h
app.use(express.urlencoded({ extended: true, limit: "16kb" })); //url apne aap special characters ko change kr deta hai so for url to do that
app.use(express.static("public")); //for images ,fevicon to be stored in 'public'
app.use(cookieParser());

export default { app };
