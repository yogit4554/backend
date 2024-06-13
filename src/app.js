import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app=express()
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({limit:"16kb"}))// json file inpit

app.use(express.urlencoded({extended:true,limit:"16kb"}))

app.use(express.static("public"))
app.use(cookieParser())

// routes import 
import userRouter from "./routes/user.routes.js"
// routes decleration 
app.use("/api/v1/users",userRouter);    /// https://localhost:8000/api/v1/users/register
// since router in different file so we need midleaware to write so app.use will be writen not app.get 

export {app}
