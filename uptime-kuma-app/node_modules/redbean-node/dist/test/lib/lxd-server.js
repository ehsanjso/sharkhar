"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { execSync } = require('child_process');
const https = require('https');
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.post('/start/:name/:password', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (process.env.LXD_PASSWORD == req.params.password) {
        try {
            res.end(execSync("lxc start " + req.params.name));
        }
        catch (e) {
            res.end("already started");
        }
    }
    else {
        res.end("Wrong Password");
    }
}));
app.post('/stop/:name/:password', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (process.env.LXD_PASSWORD == req.params.password) {
        try {
            res.end(execSync("lxc stop " + req.params.name));
        }
        catch (e) {
            res.end("already stopped");
        }
    }
    else {
        res.end("Wrong Password");
    }
}));
app.listen(process.env.LXD_PORT);
