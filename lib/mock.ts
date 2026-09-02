/*
 * Mock data for the ported screens.
 *
 * Every array below is lifted verbatim from the `class Component`
 * body and its `initial()` state in
 * `web-app-design-system/Prototype with Admin.dc.html` — the same
 * values the design prototype renders, so the ported pages show the
 * same content the design was reviewed against. Nothing here is
 * invented.
 *
 * This is placeholder data standing in for the Supabase tables in
 * `data/diagrams.md`, which don't exist yet. When the schema lands,
 * these exports get replaced by real queries; the screens importing
 * them shouldn't need to change shape.
 */

export const apiLibrary = [
    { id: 'skandar', title: 'Skandar and the Unicorn Thief', author: 'A.F. Steadman', pages: 448, series: true,
      subjects: ['Juvenile fiction', 'Fantasy & magic', 'Action & adventure'],
      summary: 'Skandar wants nothing more than to become a unicorn rider, but the islands guard their secrets closely.' },
    { id: 'impossible', title: 'Impossible Creatures', author: 'Katherine Rundell', pages: 368, series: true,
      subjects: ['Juvenile fiction', 'Fantasy & magic'],
      summary: 'A boy and a flying girl cross an archipelago where the last mythical creatures are dying.' },
    { id: 'wolfwilder', title: 'The Wolf Wilder', author: 'Katherine Rundell', pages: 248, series: false,
      subjects: ['Juvenile fiction', 'Historical fiction', 'Action & adventure'],
      summary: 'Feo teaches tame wolves to be wild again in the snow outside St Petersburg.' },
    { id: 'dragonrider', title: 'Dragon Rider', author: 'Cornelia Funke', pages: 523, series: true,
      subjects: ['Juvenile fiction', 'Dragons', 'Fantasy'],
      summary: 'A silver dragon, a brownie and an orphan boy set out to find the Rim of Heaven.' },
    { id: 'nevermoor2', title: 'Nevermoor', author: 'Jessica Townsend', pages: 464, series: true,
      subjects: ['Juvenile fiction', 'Fantasy & magic', 'Mystery & detective'],
      summary: 'A cursed girl is smuggled into a hidden city and has to win a place at its strangest institution.' }
  ];

export const books = [
    { id: 'hobbit', title: 'The Hobbit', author: 'J.R.R. Tolkien', genres: ['Fantasy', 'Adventure'], level: 'Middle Grade', pages: 310, series: true,
      summary: 'A very comfortable hobbit is talked into leaving home by a wizard and thirteen dwarves, and spends the next year regretting it and enjoying it in roughly equal measure.',
      reviews: [{ who: 'Amara K.', stars: 5, date: '12 MAR', text: 'I picked this up because of the map on the cover and finished it in a weekend. The riddles in the dark chapter is the best bit.' }, { who: 'Joel T.', stars: 4, date: '04 MAR', text: 'Slow to start but the dragon is worth it.' }] },
    { id: 'nevermoor', title: 'Nevermoor', author: 'Jessica Townsend', genres: ['Fantasy', 'Mystery/Thriller'], level: 'Middle Grade', pages: 464, series: true,
      summary: 'A cursed girl is smuggled into a hidden city and has to win a place at its strangest institution before her luck runs out.',
      reviews: [{ who: 'Priya S.', stars: 5, date: '28 FEB', text: 'If you liked the idea of a magic school but wanted something newer, start here.' }] },
    { id: 'skellig', title: 'Skellig', author: 'David Almond', genres: ['Realistic/Contemporary Fiction'], level: 'Middle Grade', pages: 182, series: false,
      summary: 'A boy finds something impossible in the garage of his family\u2019s new house, in the same week his baby sister goes into hospital.',
      reviews: [{ who: 'Mr Hale', stars: 4, date: '19 FEB', text: 'Short, strange and quietly sad. Good for readers who say they hate reading.' }] },
    { id: 'holes', title: 'Holes', author: 'Louis Sachar', genres: ['Mystery/Thriller', 'Comedy/Humour'], level: 'Middle Grade', pages: 233, series: false,
      summary: 'Sent to a desert camp for a crime he did not commit, Stanley digs one hole a day and slowly works out what is buried under all of them.',
      reviews: [{ who: 'Dan R.', stars: 5, date: '02 MAR', text: 'Three stories that turn out to be one story. I re-read it immediately.' }] },
    { id: 'amari', title: 'Amari and the Night Brothers', author: 'B.B. Alston', genres: ['Fantasy', 'Adventure'], level: 'Middle Grade', pages: 407, series: true,
      summary: 'Amari\u2019s brother has vanished, and the nomination he left behind drags her into a supernatural bureau that would rather she went home.',
      reviews: [{ who: 'Kofi A.', stars: 5, date: '08 MAR', text: 'Funny and fast. The magician thing is a great twist.' }] },
    { id: 'eragon', title: 'Eragon', author: 'Christopher Paolini', genres: ['Fantasy', 'Adventure'], level: 'Young Adult', pages: 528, series: true,
      summary: 'A farm boy finds a blue stone in the mountains. It hatches, and the empire notices.',
      reviews: [{ who: 'Lena M.', stars: 4, date: '11 MAR', text: 'Very long and very worth it if you like dragons, which I do.' }] },
    { id: 'coraline', title: 'Coraline', author: 'Neil Gaiman', genres: ['Horror', 'Fantasy'], level: 'Middle Grade', pages: 176, series: false,
      summary: 'Behind a bricked-up door in a boring new flat is a copy of Coraline\u2019s family that is much more interested in her, and that is the problem.',
      reviews: [{ who: 'Tomas B.', stars: 5, date: '21 FEB', text: 'Genuinely frightening in about four places. Buttons.' }] },
    { id: 'inkgirl', title: 'The Girl of Ink and Stars', author: 'Kiran Millwood Hargrave', genres: ['Adventure', 'Historical Fiction'], level: 'Middle Grade', pages: 227, series: false,
      summary: 'A mapmaker\u2019s daughter draws her way across a forbidden island to find a missing friend.',
      reviews: [{ who: 'Sofia D.', stars: 4, date: '14 FEB', text: 'The maps at the start of each chapter make it.' }] },
    { id: 'rooftoppers', title: 'Rooftoppers', author: 'Katherine Rundell', genres: ['Adventure', 'Historical Fiction'], level: 'Middle Grade', pages: 278, series: false,
      summary: 'Found in a cello case after a shipwreck, Sophie refuses to accept that her mother drowned, and goes looking for her across the roofs of Paris.',
      reviews: [{ who: 'Ines P.', stars: 5, date: '01 MAR', text: 'Best last chapter of anything I read this year.' }] },
    { id: 'wonder', title: 'Wonder', author: 'R.J. Palacio', genres: ['Realistic/Contemporary Fiction'], level: 'Middle Grade', pages: 315, series: false,
      summary: 'Auggie starts mainstream school at ten, and the story is told by him and by nearly everyone around him in turn.',
      reviews: [{ who: 'Grace W.', stars: 5, date: '07 MAR', text: 'Made me cry on the bus. Sorry.' }] },
    { id: 'sixofcrows', title: 'Six of Crows', author: 'Leigh Bardugo', genres: ['Fantasy', 'Mystery/Thriller'], level: 'Young Adult', pages: 465, series: true,
      summary: 'Six criminals take an impossible job breaking into the world\u2019s most secure prison, and mostly get in each other\u2019s way.',
      reviews: [{ who: 'Ruben H.', stars: 5, date: '16 FEB', text: 'A heist book where the plan going wrong is the point.' }] },
    { id: 'longway', title: 'A Long Way Down', author: 'Jason Reynolds', genres: ['Realistic/Contemporary Fiction'], level: 'Young Adult', pages: 306, series: false,
      summary: 'Sixty seconds in a lift, one floor at a time, told in verse.',
      reviews: [{ who: 'Ms Okafor', stars: 5, date: '23 FEB', text: 'Reluctant readers finish this one. Every time.' }] }
  ];

export const allGenres = ['Fantasy', 'Adventure', 'Sci-Fi', 'Romance', 'Mystery/Thriller', 'Horror', 'Historical Fiction', 'Realistic/Contemporary Fiction', 'Comedy/Humour', 'Non-fiction'];
export const allLevels = ['Middle Grade', 'Young Adult', 'Adult'];
export const allLengths = ['Under 200 pages', '200–400 pages', '400–600 pages', '600+ pages'];

export const palette = [
    { name: 'Red', css: '#C41031', ink: 'var(--color-bg)' },
    { name: 'Orange', css: '#FF4D00', ink: 'var(--color-bg)' },
    { name: 'Yellow', css: '#FFD400', ink: '#14110F' },
    { name: 'Lime', css: '#C6F24E', ink: '#14110F' },
    { name: 'Blue', css: '#1B3BFF', ink: 'var(--color-bg)' },
    { name: 'Purple', css: '#7B2DFF', ink: 'var(--color-bg)' },
    { name: 'Pink', css: '#FF3D9A', ink: '#14110F' }
  ];

export const steps = [
    { key: 'started', label: 'Just started', caption: 'JUST STARTED', pct: 15 },
    { key: 'halfway', label: 'Halfway', caption: 'ABOUT HALFWAY', pct: 50 },
    { key: 'nearly', label: 'Nearly done', caption: 'NEARLY DONE', pct: 85 }
  ];

export const adminReviews = [
  { id: 'r1', book: 'Eragon', who: 'dragonlad_09', stars: 2, when: '3 DAYS AGO', flag: 'reported', reports: 3, why: 'RUDE TO OTHER READERS ×3', text: 'this book is rubbish and anyone who likes it is an idiot, go and read something with pictures instead', status: 'pending' },
  { id: 'r2', book: 'Holes', who: 'zeni_reads', stars: 5, when: 'YESTERDAY', flag: 'blocked', reports: 0, why: 'FILTER MATCHED “SWEAR” — LIKELY A FALSE POSITIVE', text: 'the bit at the end is so good it made me swear out loud, best book we have done in class', status: 'pending' },
  { id: 'r3', book: 'Nevermoor', who: 'kofi_a', stars: 1, when: '2 DAYS AGO', flag: 'reported', reports: 1, why: 'NOTHING TO DO WITH THE BOOK ×1', text: 'buy cheap trainers at my shop, link in my profile, best prices anywhere', status: 'pending' },
  { id: 'r4', book: 'Coraline', who: 'tomasb', stars: 5, when: '4 DAYS AGO', flag: 'reported', reports: 1, why: 'BAD LANGUAGE ×1', text: 'Genuinely frightening in about four places. Buttons.', status: 'pending' }
];
export const adminAccounts = [
  { id: 'a1', name: 'dragonlad_09', colour: '#7B2DFF', ink: '#EFECE3', joined: '12 MAR', reviews: 9, lists: 3, meta: '4 REPORTS ACROSS 3 REVIEWS · EMAIL VERIFIED', flag: 'reported', why: 'RUDE TO OTHER READERS', status: 'pending' },
  { id: 'a2', name: 'bookhub_official', colour: '#FFD400', ink: '#14110F', joined: 'TODAY', reviews: 0, lists: 0, meta: '0 REVIEWS · EMAIL NOT VERIFIED', flag: 'name', why: 'IMPERSONATES THE SITE — THE FILTER CAUGHT IT AT SIGNUP', status: 'pending' },
  { id: 'a3', name: 'xx_d4mn_xx', colour: '#C41031', ink: '#EFECE3', joined: 'YESTERDAY', reviews: 1, lists: 0, meta: '1 REVIEW · EMAIL VERIFIED', flag: 'name', why: 'BANNED WORD BEHIND LEETSPEAK', status: 'pending' },
  { id: 'a4', name: 'zeni_reads', colour: '#1B3BFF', ink: '#EFECE3', joined: '02 FEB', reviews: 14, lists: 2, meta: '14 REVIEWS · 1 REPORT · EMAIL VERIFIED', flag: 'clean', why: 'NO ACTION NEEDED — SHOWN FOR CONTEXT', status: 'clean' },
  { id: 'a5', name: 'kofi_a', colour: '#c6f24e', ink: '#14110F', joined: '19 JAN', reviews: 6, lists: 1, meta: '6 REVIEWS · 1 REPORT · EMAIL VERIFIED', flag: 'reported', why: 'SPAM OR ADVERTISING', status: 'pending' }
];
export const catalogue = [
  { id: 'hobbit', title: 'The Hobbit', author: 'J.R.R. Tolkien', pages: 310, level: 'Middle Grade', genres: ['Fantasy', 'Adventure'], cover: 'api' },
  { id: 'nevermoor', title: 'Nevermoor', author: 'Jessica Townsend', pages: 464, level: 'Middle Grade', genres: ['Fantasy', 'Mystery/Thriller'], cover: 'upload' },
  { id: 'holes', title: 'Holes', author: 'Louis Sachar', pages: 233, level: 'Middle Grade', genres: ['Mystery/Thriller', 'Comedy/Humour'], cover: 'api' },
  { id: 'skellig', title: 'Skellig', author: 'David Almond', pages: 182, level: 'Middle Grade', genres: ['Realistic/Contemporary Fiction'], cover: null },
  { id: 'girlofink', title: 'The Girl of Ink and Stars', author: 'Kiran Millwood Hargrave', pages: 227, level: 'Middle Grade', genres: ['Adventure', 'Historical Fiction'], cover: null }
];
export const safeguarding = [
  { id: 's1', who: 'quiet_reader_11', target: 'a review on “A Long Way Down”', when: '4 HOURS AGO', text: 'they said something about not wanting to be here anymore and it scared me', status: 'open' },
  { id: 's2', who: 'zeni_reads', target: 'the reader kofi_a', when: 'YESTERDAY', text: 'he keeps asking people in reviews how old they are and where they go to school', status: 'open' }
];
export const requests = [
  { title: 'Impossible Creatures', author: 'Katherine Rundell', status: 'approved', reason: '' },
  { title: 'The Boy in the Striped Pyjamas', author: 'John Boyne', status: 'declined', reason: 'This one is written for older readers and we keep the catalogue to Middle Grade and Young Adult. Ask your school library about it.' },
  { title: 'Skandar and the Unicorn Thief', author: 'A.F. Steadman', status: 'pending', reason: '' }
];
/* Derived helpers — the same one-liners the prototype defines on the
   component, kept here so every screen formats stars, lengths and
   averages identically. */

export type Book = (typeof books)[number];
export type Review = { who: string; stars: number; date: string; text: string };

export const reviewsFor = (b: Book): Review[] => b.reviews ?? [];

export const avg = (b: Book): number => {
  const r = reviewsFor(b);
  return r.length ? r.reduce((t, x) => t + x.stars, 0) / r.length : 0;
};

/* Five filled/empty stars as one string, e.g. 4 -> "★★★★☆". */
export const starStr = (n: number): string =>
  '★★★★★☆☆☆☆☆'.slice(5 - Math.round(n), 10 - Math.round(n));

export const lengthLabel = (p: number): string =>
  p < 200 ? 'Under 200 pages'
  : p <= 400 ? '200–400 pages'
  : p <= 600 ? '400–600 pages'
  : '600+ pages';

export const bookById = (id: string): Book | undefined =>
  books.find((b) => b.id === id);
