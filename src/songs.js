const SONGS = [
  {
    id: 'sweden',
    country: 'Sweden',
    flag: '\u{1F1F8}\u{1F1EA}',
    artist: 'Nova Lindstr\u00f6m',
    title: 'Midnight Signal',
    genre: 'Electropop',
    lyrics: `[Verse 1]
Neon lights through the window pane
Your frequency is calling again
Static hearts in a digital world
Every word like a flag unfurled

[Pre-Chorus]
Can you hear me now?
Through the noise somehow

[Chorus]
Midnight signal, burning bright
Cutting through the satellite
We don't need a reason why
We were made to amplify
Midnight signal, you and I
Dancing on a beam of light`,
  },
  {
    id: 'italy',
    country: 'Italy',
    flag: '\u{1F1EE}\u{1F1F9}',
    artist: 'Marco Fontana',
    title: 'Fuoco Dentro',
    genre: 'Rock Ballad',
    lyrics: `[Verse 1]
Sotto un cielo che brucia d'oro
Trovo te, il mio tesoro
Le parole non bastano mai
Ma il cuore sa quello che sai

[Chorus]
Fuoco dentro, fuoco dentro
Brilla forte nel mio centro
Non mi fermo, non mi arrendo
Con te volo, il mondo prendo

[Verse 2]
Every heartbeat a drum in the night
Every shadow becomes the light
From Milano to the edge of the sea
This fire inside is setting me free`,
  },
  {
    id: 'ukraine',
    country: 'Ukraine',
    flag: '\u{1F1FA}\u{1F1E6}',
    artist: 'Kalyna Sisters',
    title: 'Sunflower Dreams',
    genre: 'Folk Electronic',
    lyrics: `[Verse 1]
Golden fields stretch to the horizon
Where my grandmother used to sing
Ancient melodies of the rising sun
Hope is an everlasting thing

[Chorus]
Sunflower dreams, reaching for the sky
Roots so deep they'll never die
Through the storm we bloom again
Beautiful, defiant, amen

[Bridge]
La la la, la la la
Voices of a thousand years
La la la, la la la
Turning sorrow into cheers`,
  },
  {
    id: 'france',
    country: 'France',
    flag: '\u{1F1EB}\u{1F1F7}',
    artist: 'Camille Duval',
    title: 'Papillon de Nuit',
    genre: 'Chanson Pop',
    lyrics: `[Verse 1]
Dans les rues de Paris, minuit sonne
Les lumi\u00e8res dansent, mon c\u0153ur frissonne
Je suis le papillon de la nuit
Libre dans l'obscurit\u00e9 qui luit

[Chorus]
Papillon de nuit, vole avec moi
Au-dessus des toits, regarde-moi
On est vivants, on est ici
Le monde est beau quand on sourit

[Verse 2]
Butterfly of the darkest hour
Finding beauty, finding power
Paris whispers, the Seine reflects
Every dream that love protects`,
  },
  {
    id: 'norway',
    country: 'Norway',
    flag: '\u{1F1F3}\u{1F1F4}',
    artist: 'Bj\u00f8rn & The Northern Lights',
    title: 'Aurora',
    genre: 'Indie Folk',
    lyrics: `[Verse 1]
Fjords of silence, mountains tall
Northern lights begin to fall
Like a curtain made of dreams
Nothing's ever what it seems

[Chorus]
Aurora, paint the sky for me
Aurora, set my spirit free
In the cold I find my fire
In the dark my one desire

[Bridge]
Oh oh oh, we are the north
Oh oh oh, we're coming forth
With the wolves we howl tonight
Chasing colors, chasing light`,
  },
  {
    id: 'spain',
    country: 'Spain',
    flag: '\u{1F1EA}\u{1F1F8}',
    artist: 'Lola Reyes',
    title: 'Baila Conmigo',
    genre: 'Reggaeton Pop',
    lyrics: `[Verse 1]
La noche es joven, el ritmo late
Tus ojos brillan como chocolate
No necesito una raz\u00f3n m\u00e1s
Contigo el mundo va a bailar

[Chorus]
Baila conmigo, siente el fuego
Baila conmigo, es nuestro juego
Uno, dos, tres, cuatro
Dale que la noche es un teatro

[Post-Chorus]
Eh eh eh, mueve as\u00ed
Eh eh eh, ven aqu\u00ed
The rhythm is all we need tonight
Together we set the world alight`,
  },
  {
    id: 'greece',
    country: 'Greece',
    flag: '\u{1F1EC}\u{1F1F7}',
    artist: 'Elena Papadopoulos',
    title: 'Mythology',
    genre: 'Dance Pop',
    lyrics: `[Verse 1]
On the shores of the Aegean Sea
Ancient gods are watching me
Aphrodite gave me love
Written in the stars above

[Chorus]
We're writing our own mythology
You and me, a new odyssey
No looking back, Eurydice
This time love will set us free

[Verse 2]
Poseidon's waves crash at my feet
The oracle says we're meant to meet
A labyrinth of golden thread
Following where my heart is led`,
  },
  {
    id: 'finland',
    country: 'Finland',
    flag: '\u{1F1EB}\u{1F1EE}',
    artist: 'Darkforge',
    title: 'Metal Heart',
    genre: 'Symphonic Metal',
    lyrics: `[Verse 1]
Forged in ice and northern steel
This is something you can feel
Thunder rolls across the lake
Every chain is mine to break

[Chorus]
Metal heart, beating strong
Metal heart, sing my song
In the pit we come alive
Metal heart will survive

[Bridge]
RAAAAH!
Keyboards blazing, drums on fire
Taking this whole thing higher
Helsinki to the world tonight
Metal heart ignite!`,
  },
  {
    id: 'switzerland',
    country: 'Switzerland',
    flag: '\u{1F1E8}\u{1F1ED}',
    artist: 'Luca Bernardi',
    title: 'Echoes in the Alps',
    genre: 'Art Pop',
    lyrics: `[Verse 1]
High above where eagles dare
Thin air carries every prayer
Yodeling turned to synth and soul
Mountains make the broken whole

[Chorus]
Echoes in the Alps, hear me call
Echoes in the Alps, I won't fall
My voice rings from peak to peak
Strong when the world thinks I'm weak

[Verse 2]
Precision, patience, chocolate dreams
Nothing's quite the way it seems
Neutral ground but a passionate sound
In these echoes I am found`,
  },
  {
    id: 'ireland',
    country: 'Ireland',
    flag: '\u{1F1EE}\u{1F1EA}',
    artist: 'Saoirse Flynn',
    title: 'Celtic Thunder',
    genre: 'Celtic Pop',
    lyrics: `[Verse 1]
Green hills rolling to the shore
Fiddle plays forevermore
Pub lights golden, Guinness flows
Where the river Shannon goes

[Chorus]
Celtic thunder in my veins
Dancing joy and dancing pains
Stomp your feet upon the ground
Let the craic go round and round

[Bridge]
Oi oi oi, raise your glass
Oi oi oi, this will last
From Dublin town to Galway Bay
We'll sing until the break of day`,
  },
  {
    id: 'albania',
    country: 'Albania',
    flag: '\u{1F1E6}\u{1F1F1}',
    artist: 'Elira Kelmendi',
    title: 'Eagle Heart',
    genre: 'Power Ballad',
    lyrics: `[Verse 1]
In the night I feel the destiny
Ancient winds are calling me
From the mountains to the sea
My soul is wild and running free

[Pre-Chorus]
Through the shadows we will rise
See the truth inside our eyes

[Chorus]
Fire in my eagle heart
We were burning from the start
Dancing in the purple sky
We are born to never die
Fire in my eagle heart
Tear the silent dark apart
Shining like a shooting star
This is who we really are`,
  },
  {
    id: 'netherlands',
    country: 'Netherlands',
    flag: '\u{1F1F3}\u{1F1F1}',
    artist: 'Joost de Vries',
    title: 'Windmill Mind',
    genre: 'Quirky Pop',
    lyrics: `[Verse 1]
My head is spinning like a windmill
Thoughts going round and round until
The tulips bloom inside my brain
And everything makes sense again

[Chorus]
Windmill mind, going crazy
Windmill mind, feeling hazy
Round and round the world we go
Fast then fast then really slow

[Verse 2]
Orange madness, cheese and bikes
This is what the whole world likes
Flatten mountains, drain the sea
Nobody does it quite like me`,
  },
];

export default SONGS;
