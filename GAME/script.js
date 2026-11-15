
const size = 50
let menu = true

const win = new Audio("sfx/yay.mp3")
const death = new Audio("sfx/death.mp3")
const game = document.querySelector("#game")
const plr = document.querySelector(".plr")
const winzone = document.querySelector(".winzone")

let xof = 0
let yof = 0

let xv = 0
let yv = 0

let grounded = false
let flipped = true

let a = false
let d = false

const gravity = 1

let levell = 1

let wheight = window.innerHeight
let wlength = window.innerWidth

let wspeed = wlength / size / 4

window.addEventListener("resize", function() {
    wheight = window.innerHeight
    wlength = window.innerWidth
    wspeed = wlength / size / 4
})

const fps = 60

// kb

document.addEventListener("keyup", function(key) {
    if (key.key === "a") {
        a = false
    }

    if (key.key === "d") {
        d = false
    }

    if (key.key === "w" || key.key === " ") {
        flipped = !flipped
        yv = 0
    }

    if (key.key === "Escape") {
        if (menu === true) {
            menu = false
        }
        else {
            menu = true
        }
    }
})

document.addEventListener("keydown", function(key) {
    if (key.key === "a") {
        a = true
    }

    if (key.key === "d") {
        d = true
    }
})

// game loop

setInterval(function() {

    //escape menu
    if (menu === true) {
        document.querySelector(".menu").style = "position: fixed; left: 35%; width: "
    }


    // MOVEMENT

    if (d && !a) {
        xof += wspeed
    }

    if (a && !d) {
        xof -= wspeed
    }

    // walls

    if (xof < 0) {
        xof = 0
    }

    if (xof > wlength - size) {
        xof = wlength - size
    }

    // wall and floor

    if (yof <= size / 2) {
        yof = size / 2
        yv = 0
    }

    if (yof >= wheight - size) {
        yof = wheight - size
        yv = 0
    }

    yv += gravity

    xof -= xv

    if (flipped === true) {
        plr.src="textures/character.png"

        plr.style = `
            height: ${size}px;
            width: ${size}px;
            //background-color: skyblue;
            transform: translate(${xof}px, ${yof}px);
        `

        yof += yv
    }

    if (flipped === false) {
        plr.src="textures/flipped.png"
        plr.style = `
            height: ${size}px;
            width: ${size}px;
            //background-color: yellow;
            transform: translate(${xof}px, ${yof}px);
        `

        yof -= yv
    }

    // WINZONE MOVEMENT

    if (levell === 1) {
        document.querySelector(".two").hidden = true
        winzone.style = `
            background-color: lime;
            height: 10%;
            width: 10%;
            position: absolute;
            top: 50%;
            left: 90%;
        `
    }
    if (levell === 2) {
        document.querySelector(".two").hidden = false

        if (yof <= 35) {
            plr.hidden = true
            yof = 200
            xof = 50
            yv = 100
            flipped = true
            setTimeout(function(){
                plr.hidden = false
            }, 100)
        }
    }

    // WINZONE COLLISION

    if (
        levell === 1 &&
        xof + size >= wlength * 0.9 &&
        xof <= wlength &&
        yof + size >= wheight * 0.5 &&
        yof <= wheight * 0.6
    ) {
        win.play()
        levell = 2
        xof = 50
        yof = 200
        yv = 100
        document.querySelectorAll(".one").forEach((element) => {
            element.remove()
        })
        flipped = true
        let bgg = document.createElement("img")
        bgg.src="textures/bg.png"
        document.getElementById("game").appendChild(bgg)
        bgg.style.marginLeft = "-50%"
        bgg.style.left = "100%"
        bgg.style.width = "200%"
        bgg.style.height = "100%"
        let killbrick = document.createElement("div")
        document.getElementById("game").appendChild(killbrick)
        killbrick.style = `
        
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 5%;
        background-color: red;
        z-index: 4;
        
        `
    }

}, 1000 / fps)
