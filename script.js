const size = 50
const plr = document.querySelector(".plr")
let xof = 0
let yof = 0
let xv = 0
let yv = 0
let grounded = false
let flipped = true
let a = false
let d = false
const wspeed = 10
const gravity = 1
const wheight = window.innerHeight
const wlength = window.innerWidth
let level = 1


const fps = 60
//TARGET FPS

document.addEventListener("keyup", function(key){
    console.log(key.key)
    if (key.key === "a") {
        a = false
    } 
    if (key.key === "d") {
        d = false
    } 
    if (key.key === "w" || key.key === " ") {
        if (flipped === true) {flipped = false} else {flipped = true}
        yv = 0
    } 
})

document.addEventListener("keydown", function(key){
    console.log(key.key)
    if (key.key === "a") {
        a = true
    } 
    if (key.key === "d") {
        d = true
    }
})

setInterval(function(){
    if (d === true && a === false) {
        xof = xof + wspeed
    }
    if (a === true && d === false) {
        xof = xof - wspeed
    }

    if (yof <= size/2) {
        yof = size/2
        yv = 0
    }
    
    if (yof >= wheight - size * 2) {
        yof = wheight - size * 2
        yv = 0
    }
    yv = yv + gravity
    xof = xof - xv
    if (flipped === true) {plr.style = "height: "+size+"px; width: "+size+"px; background-color: skyblue; transform: translate("+xof+"px, "+yof+"px);"
        yof = yof + yv
    }
    if (flipped === false) {plr.style = "height: "+size+"px; width: "+size+"px; background-color: yellow; transform: translate("+xof+"px, "+yof+"px);"
        yof = yof - yv
    }
    console.log(grounded)
}, 1000/fps)