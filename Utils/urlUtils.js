

function generateRandomUrl() {
  var rndResult = "";
  var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
  var charactersLength = characters.length;

  for(let i=0;i<5;i++){
    rndResult += characters.charAt(
      Math.floor(Math.random()*charactersLength)
    );
  }
  return rndResult
}




module.exports = { generateRandomUrl };
