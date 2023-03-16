const gameVerdict = (selectedOption, opponentsOption) => {
  const rockArray = ["scissors", "lizard"]
  const paperArray = ["rock", "spock"]
  const scissorsArray = ["paper", "lizard"]
  const lizardArray = ["paper", "spock"]
  const spockArray = ["scissors", "rock"]
  switch (selectedOption) {
    case "rock":
      if(opponentsOption === "rock"){return "draw"} 
      if(rockArray.includes(opponentsOption)){return "won"}
      if(!rockArray.includes(opponentsOption)){return "lost"};
    break;
    case "paper":
      if(opponentsOption === "paper"){return "draw"} 
      if(paperArray.includes(opponentsOption)){return "won"}
      if(!paperArray.includes(opponentsOption)){return "lost"};
    break;
    case "scissors":
      if(opponentsOption === "scissors"){return "draw"} 
      if(scissorsArray.includes(opponentsOption)){return "won"}
      if(!scissorsArray.includes(opponentsOption)){return "lost"}
    break;
    case "lizard":
      if(opponentsOption === "lizard"){return "draw"} 
      if(lizardArray.includes(opponentsOption)){return "won"}
      if(!lizardArray.includes(opponentsOption)){return "lost"};
      break;
    case "spock":
      if(opponentsOption === "spock"){return "draw"} 
      if(spockArray.includes(opponentsOption)){return "won"}
      if(!spockArray.includes(opponentsOption)){return "lost"};
      break;
    default: 
      break;
  }
}
module.exports = {gameVerdict}