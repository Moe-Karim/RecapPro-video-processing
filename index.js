import express from "express";
import { exec } from "child_process";
import util from "util";
import fs from "fs";
const app = express();
const PORT = 4000;