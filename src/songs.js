// ─── Song data ────────────────────────────────────────────────────────────────
// To add a new country's song:
// 1. Upload the MP3 to Supabase Storage (see README)
// 2. Upload the cover image to Supabase Storage
// 3. Copy the public URLs and add an entry below

const SONGS = {
  Albania: {
    title: "Eagle Heart",
    // Replace these with your Supabase Storage public URLs after upload
    audioUrl: process.env.REACT_APP_ALBANIA_AUDIO,
    coverUrl: process.env.REACT_APP_ALBANIA_COVER,
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
This is who we really are

[Verse 2]
Mystic rhythm in my veins
Echoes calling through the rain
Golden future, crimson flame
Love and power are the same

[Bridge]
Oh oh oh
Voices of eternity
Oh oh oh
Fly with me, fly with me

[Choir]
Fire in my eagle heart
Higher now we fall apart
Singing to the endless night
We are made of ancient light`,
  },

  // Example of how to add the next country:
  // Norway: {
  //   title: "My Song Title",
  //   audioUrl: process.env.REACT_APP_NORWAY_AUDIO,
  //   coverUrl: process.env.REACT_APP_NORWAY_COVER,
  //   lyrics: `...`,
  // },
};

export default SONGS;
