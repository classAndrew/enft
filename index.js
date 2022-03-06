const express = require('express');
const path = require('path');
const execSync = require('child_process').execSync;
const fs = require("fs");
const { default: axios } = require('axios');

const publicDirectoryPath = path.join(__dirname, './public');
const app = express();

const port = 3000;

const ADJ_LEN = 2;
const NOUN_LEN = 2;
const MAX_ITER = 1;
const SAVE_AT = 1;

app.use(express.static(publicDirectoryPath));

function getWords(fn) {
    return fs.readFileSync(fn).toString().split('\n');
}

const config = JSON.parse(fs.readFileSync("config.json").toString());

const adjectives = getWords("assets/adjectives.txt");
const nouns = getWords("assets/nouns.txt");

function generatePrompt(adjectives, nouns) {
    let adj = "";
    let noun = "";

    for (let i = 0; i < ADJ_LEN; i++) {
        const adj_idx = Math.floor(Math.random()*adjectives.length); 
        adj += adjectives[adj_idx] + " ";
    }

    for (let i = 0; i < NOUN_LEN; i++) {
        const noun_idx = Math.floor(Math.random()*nouns.length); 
        noun += nouns[noun_idx] + " ";
    }

    return adj+noun;
}

app.get('/', (req, res) => {
  res.sendFile("public/index.html");
});

app.get("/getimage", (req, res) => {
    // generate a prompt

    const prompt = generatePrompt(adjectives, nouns);
    const prompt_fn = prompt.split(' ').join('_');

    console.debug(`generating ${prompt}`);

    // ask vqgan to generate the image
    const output = execSync(
`cd VQGAN-CLIP &&\
 python3 generate.py -p "${prompt}" -se ${SAVE_AT} -i ${MAX_ITER} -conf checkpoints/vqgan_imagenet_f16_1024.yaml -ckpt checkpoints/vqgan_imagenet_f16_1024.ckpt\
 -o ${prompt_fn}.png\
 && mv ${prompt_fn}.png ../images/${prompt_fn}.png`);

    res.sendFile(`images/${prompt_fn}.png`, { root: __dirname }); 
});

app.get("/listcharities", (req, res) => {
    const keywords = req.query.keywords || "environmental";
    const charity_uri = `https://api.data.charitynavigator.org/v2/Organizations?
app_id=${config["CHARITY_API_ID"]}&app_key=${config["CHARITY_API_KEY"]}&search=${keywords}`.replace('\n', '');
    axios.get(charity_uri)
        .then((resp) => {
            const charList = resp.data
                .map((v) => v["charityName"]);
            
            res.json(charList);
        }).catch((err) => {
            console.debug(err);
            res.send(err);
        })
});

app.get("/style.css", (req, res) => {
    res.sendFile("public/style.css");
});

app.listen(port, () => {
  console.log(`Starting project on ${port}`);
});