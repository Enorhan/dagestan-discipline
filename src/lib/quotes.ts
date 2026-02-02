// Stoic and Dagestani fighter quotes for mental toughness

export const stoicQuotes = [
  // Khabib & Dagestani fighters
  "If you give up, you're finished. - Khabib Nurmagomedov",
  "I don't train to be the best. I train because I have to. - Khabib Nurmagomedov",
  "Discipline is doing what you hate to do, but doing it like you love it. - Khabib Nurmagomedov",
  "Your mind will quit a thousand times before your body will. - Khabib Nurmagomedov",
  "Champions are made when no one is watching.",
  "In Dagestan, we don't make excuses. We make champions.",
  "The mountain doesn't care about your feelings. Neither does your opponent.",
  
  // Marcus Aurelius
  "You have power over your mind - not outside events. Realize this, and you will find strength. - Marcus Aurelius",
  "The impediment to action advances action. What stands in the way becomes the way. - Marcus Aurelius",
  "Waste no more time arguing what a good man should be. Be one. - Marcus Aurelius",
  "Do not indulge in dreams of having what you have not, but reckon up the chief of the blessings you do possess. - Marcus Aurelius",
  "The best revenge is to be unlike him who performed the injury. - Marcus Aurelius",
  
  // Epictetus
  "No man is free who is not master of himself. - Epictetus",
  "It's not what happens to you, but how you react to it that matters. - Epictetus",
  "First say to yourself what you would be; and then do what you have to do. - Epictetus",
  "Wealth consists not in having great possessions, but in having few wants. - Epictetus",
  "He who laughs at himself never runs out of things to laugh at. - Epictetus",
  
  // Seneca
  "We suffer more often in imagination than in reality. - Seneca",
  "Difficulties strengthen the mind, as labor does the body. - Seneca",
  "It is not because things are difficult that we do not dare; it is because we do not dare that they are difficult. - Seneca",
  "Begin at once to live, and count each separate day as a separate life. - Seneca",
  
  // General warrior wisdom
  "Discipline equals freedom.",
  "The only easy day was yesterday.",
  "Embrace the suck.",
  "Pain is temporary. Quitting lasts forever.",
  "Comfort is the enemy of progress.",
  "Your body can stand almost anything. It's your mind you have to convince.",
  "The fight is won or lost far away from witnesses. It is won behind the lines, in the gym, and out there on the road, long before I dance under those lights.",
  "I fear not the man who has practiced 10,000 kicks once, but I fear the man who has practiced one kick 10,000 times.",
  "The more you sweat in training, the less you bleed in battle.",
  "Discipline is choosing between what you want now and what you want most.",
]

export const getRandomQuote = (): string => {
  return stoicQuotes[Math.floor(Math.random() * stoicQuotes.length)]
}

export const getDailyQuote = (): string => {
  // Use date as seed for consistent daily quote
  const today = new Date().toDateString()
  let hash = 0
  for (let i = 0; i < today.length; i++) {
    hash = ((hash << 5) - hash) + today.charCodeAt(i)
    hash = hash & hash
  }
  const index = Math.abs(hash) % stoicQuotes.length
  return stoicQuotes[index]
}

