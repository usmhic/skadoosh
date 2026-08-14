import type { UserRole, WorkType } from "./schema";

export const SEED_CREATOR = {
  id:       "user_al_hishu",
  name:     "محمد الهيشو",
  username: "al-hishu",
  email:    "mohammed@alhishu.com",
  role:     "creator" as UserRole,
  bio:      "Moroccan writer. In my writing I explore the relationship between identity and belonging, and life between the two shores of the Mediterranean.",
};

export const SEED_WORKS: Array<{
  id: string; type: WorkType; accentColor: string; readingTime: number; published: boolean;
  title: Record<string, string>; tag: Record<string, string>;
  bodyAr: string; bodyEn: string;
}> = [

  // ─── 1. B78 (Short Story Collection) ────────────────────────────────────────
  {
    id: "work_b78_collection", type: "story", accentColor: "#1a1a2e", readingTime: 25, published: true,
    title: { ar: "B78 — مجموعة قصصية", en: "B78 — Short Story Collection" },
    tag:   { ar: "مجموعة قصصية · ساخرة", en: "Short Stories · Satirical" },
    bodyAr: `B78
مجموعة قصصية
محمد الهيشو

—

B78

للتسكع صباحًا بين أزقة المدينة القديمة وشوارع تطوان العصرية نكهة خاصة، رغم قساوة الطقس وخواء الجيب. رفيقك يحذرك من مغبة إطالة النظر إلى عناوين المجلات في الواجهة الزجاجية لمكتبة «أبينيدا»، فهو المسلك المفضل لـ«السكوليط» نائب الحارس العام بالقسم الداخلي.

يلفت انتباهك عنوان على الصفحة الأولى لإحدى المجلات:
«كمال أتاتورك، الزعيم التركي الذي أخافه الطربوش».

تتساءل مع نفسك: كيف لزعيم أن يخيفه الطربوش؟

فجأة، يدفعك رفيقك بقوة نحو اليمين: «لا تلتفت إلى الوراء! إنه خلفنا... هيا أسرع... أسرع!»

تدخلان زقاقًا ضيقًا، تُسرعان خطواتكما نحو الأمام، تتخلصان من شبح «الحارس العام» لكنكما تمضيان مباشرة نحو «السكوليط».

يقف أمامكما وسط الشارع العام. حلته تدعو إلى الشفقة، بل إلى الاشمئزاز أيضًا. يمسك عود ثقاب من نوع «الفارس الأزرق»، ويدوّن عليه رقمك: B78. ينصرف مزهوًا بنصره.

أنت تعرف أن العقاب بانتظارك. ستكون معاقبًا وممنوعًا من الخروج خلال نهاية الأسبوع، ومع ذلك لا تفكر في العقاب. كل ما يشغل بالك هو ذاك العنوان الغريب: «كمال أتاتورك، الزعيم التركي الذي أخافه الطربوش».

تتساءل مجددًا: كيف لزعيم أن يخيفه الطربوش؟`,
    bodyEn: `B78
A Short Story Collection
Mohammed Al-Hishu

—

B78

There is a particular pleasure to wandering through the old city alleys and the modern streets of Tetouan in the morning, despite the harsh weather and empty pockets. Your companion warns you not to linger too long over magazine headlines in the glass window of the "Avenida" bookshop — it is the preferred beat of "the Scout," deputy general warden of the Interior Division.

A headline catches your eye on the front page of one of the magazines:
"Kemal Atatürk: The Turkish Leader Who Feared the Fez."

You ask yourself: how can a leader be frightened by a hat?

Suddenly your companion shoves you sharply to the right. "Don't look back! He's behind us… come on, faster, faster!"

You duck into a narrow alley, quickening your pace, shaking off the ghost of the "General Warden" — only to walk straight into the Scout.

He stands in the middle of the public street. His appearance invites pity, and something close to disgust. He holds a matchstick from the "Blue Knight" brand and writes your number on it: B78. He walks away, proud of his little victory.

You know punishment is coming. You will be confined to the premises all weekend. Yet you are not thinking about the punishment. All that occupies your mind is that strange headline: "Kemal Atatürk: The Turkish Leader Who Feared the Fez."

You ask yourself again: how can a leader be frightened by a hat?

—

The Threshold

…When the dream slipped free from the claws of the night and blended with the screaming of a vagrant jolted awake by a kick from the café owner next door, everything became confused. I became the vagrant myself — sleeping on the threshold, sprawled on the pavement — while my dream turned into a scream, then howling, then braying, then roaring… and so it went.

My intention in sleeping on his café step was not to block his livelihood, as the man claimed, nor was my presence on the pavement a mere accident, as I insisted. And my attempt to finish him off was only an attempt to free him from the cruelty of a life that had made him a burden on a concrete doorstep — after careful surveillance, of course.

He lay on the ground, drenched in his own blood on the pavement. And I had just stepped out of my dream, startled by the screaming. I rushed to the window. I saw the real vagrant — the one who sleeps on the café step at night — drowning in his blood.

The café owner stood a few steps away, watching with suspicion.

I was afraid of being accused. Afraid someone would see me. I retreated inside, then to the bathroom. I closed the door and sat in the dark, listening to my heartbeat.

And is there anything more restful than a bathroom? I said to the officer who broke down the toilet door on me, trying to add a charge of hiding to my already-heavy file.

The man did not die as I had wished in my dream. And the vagrant was not convicted as I had expected — nor as I had hoped — only I was condemned: stripped of my dreams, and my café doorstep exchanged for a pillow of cotton and silk.

—

The Story of a Sparrow

What is your name?
Sparrow.

How old are you?
I have not been born yet.

What is your hobby?
Chirping on branches.

What is your profession?
Flying.

Do you have a permit to fly through the airspace of others?
The airspace is disputed.

And what about chirping?
It is nothing more than poems in praise of the leader.

The leader has a barber, a cook, and a crowd of clappers — spare yourself the trouble.

As the two of them walked toward the night and into the darkness, Sparrow felt a cold breeze carrying the smell of death. He remembered the story of the forest, and a longing swept over him to embrace the family and loved ones who had taken the same road and vanished in the same circumstances.

—

Weapon

She brandished the weapon of her beauty at her boss, and he gave her extra paid leave.

She brandished the weapon of her femininity at the traffic officer, and he waived the fine.

She brandished the weapon of her coquetry at the building doorman, and he became her obedient servant.

She brandished the weapon of her short skirt at Haj Younes, the landlord, and he lowered the rent.

She brandished the weapon of love at Salim the fireman, her neighbour…

And his wife fell upon her, threw her to the ground, slaughtered her and cut her to pieces.

Then she kept some of her in the refrigerator, and cooked the other portion of her tender flesh for her hungry husband.

—

The Mask

Put on the mask… take off the mask.
Hurry up… they'll catch you without a mask.
It carries a 300-dirham fine.

Take the taxi… hit the road.

Do you have your masks, brothers? (the taxi driver)

I do… and I do… I don't!

Here, keep mine.

Put it in your pocket please, and when we get close to the checkpoint put it on…

The mask has become like a national ID card — you always have to have it on you, even if you don't wear it. (one of the passengers)

It's become an actual passport. Swear to God if you don't have it they won't let you into the bank.

But once you're inside — take it off. You won't find anyone wearing it in there, including the staff.

Only the security guard wears his! Haha.

And why do they call him a security guard anyway? Haha.

It's over 40 degrees — we struggle to breathe even without the mask, let alone with one.

Please put your masks on, we're approaching the checkpoint. (taxi driver)

I've started putting the mask away with the soap at home, like I put away an old jacket or worn trousers…

See! I told you they'd be collecting "fees" from people…

What fees? That's a mandatory donation to help the state cover vaccination costs…

What costs? All of that comes free from the United Nations!

None of it comes free, my friend… the state pays for everything… and what it gives with the left hand it takes back with the right…

Hahaha…

Ladies and gentlemen, who hasn't paid yet? (taxi driver)

Me… me…

And who still owes change?

Good Lord, who hasn't paid me yet?

Where did the guy go who was sitting next to you?

I'm alone… alone. The one sitting next to me wasn't with me!

Where did he go, that son of… where did he go?

He ran off. He left without paying.

God provide, my friend…

God blind whoever blinded you! Get away from me… just go… God curse you all… God curse you!

—

On the Bank of "O Thou"

"If it pleases you that I humiliate myself to be what you want, then I am ready to humiliate myself for your sake."

This shard he fired at her face was enough to knock her off balance — she who has no idea what an apology is, who has mastered the role of lofty indifference, hiding beneath a mask of pride a fragility seen only by those who have reached her depths.

"Hush… don't think ill of me, O thou…"

She stopped at that "O thou" — a word suspended between hesitation and wound, as if searching for a description worthy of him, but she did not finish the sentence. Yet he knew, instinctively, what she would have said next. He had heard it thousands of times in her silence before her words.

"Those who know you with their heart, not their eyes, do not think ill of you."

This line — borrowed from Mawlana Jalal al-Din Rumi — was the right response at the right moment. He delivered it quietly, as if rearranging the scene, turning the bank of "O thou" into the shore of their eternal love, where there is no room for shouting, and no need for titles.

He said nothing more, and she added nothing. Silence was their secret language. A silence that was not comfortable calm, but a smouldering of another kind. As if they stood at the edge of an abyss, between an unspoken word and an incomplete love.

On the bank of "O thou," they stood together — he carrying his heavy words, she trying to tame her pride. Each wanting the other, yet neither willing to break first.

There, where words stop, the aching emptiness begins. An emptiness that drowns them in questions with no answers, such as: What if she had finished "O thou…"? What if he had said nothing and stayed silent?

But they knew — in the depths of their hearts — that this shore is not for endings. It is the shore of the postponed beginning, where love waits for the courage of confession, not the shards of words.

—

Haj Noel

"Between the head of the New Year and its feet lies a small passage leading to nothingness, to timelessness, and to the warehouse of dreams and souls."

These were the words with which the man surprised me — a man who later told me he was known among the angels as "Haj Noel" — as I was about to leave the cemetery through its back gate after joining the procession that accompanied the departed to her final rest.

"Don't try to mislead me. By instinct, and by certain blessings from my angelic friends, I know you're heading straight to the bar to celebrate the New Year. And you…"

I interrupted him with unusual boldness — though by nature I am a coward, and had never once dared to drink, not even from the cursed bottle of vodka that had shattered on the head of the late woman and dropped her instantly dead.

"For your information, you wretched angel!"

"I am Haj Noel, friend of the angels — I make no claim to be an angel myself. You drunkard who never once dared seek the blessing of a bar, nor drink from the sacred vodka bottle — my daily gift to the lost like you!"

"For your information, you dull Noel, I am going to the bar to toast the New Year's feet — for it is the custom of saints like me to drink to the nihilists, after they have reached the stage of raving and fighting among themselves!"

"And it is my custom, as a close friend of the angels, to carry the cage of nothingness and drop as many of your kind as possible into the deep abyss of timelessness — between the head of the New Year and its feet!"

"It is an honour to meet you, devil."

"You are mistaken. I am Haj Noel, friend of the angels."

—

The Vodka Seller

He sells them bottles of counterfeit vodka for a hundred dirhams, and they thank him and shower him with endless blessings:

God help you, brother Jamal.
God protect you, brother Jamal.
God bring you ease, brother Jamal.

And when the blessings shift toward something like a rebuke addressed to the afflicted, addicted self:

God forgive us, brother Jamal.

He tells them honestly:

"I sell you tenth-grade vodka. You drink halal vodka. What intoxicates you is the glitter of the bottle, not the liquid inside. Real vodka is too expensive for you. Haha."

"God forgive you too, brother Jamal… and protect you, even though you've played us!"

"Don't worry about me. God keeps me safe — because I work in the halal trade. And I only sell you halal things. Haha."

—

The Gossip Ant

The gossip ant — an insect with paper wings —
hates spring and its coloured blossoms,
feeds on gossip,
and sows discord among the insects.

She incites the cockroaches to devour the flowers and destroy them,
threatening the safety of the bees and their daily nourishment.

The cockroach leader appointed her as minister in his burrow,
charged with erasing colours and exterminating the roses.

But the queen bee sent the warrior wasp after her,
who pollinated her with a seed from a carnation.

A week later, her paper wings fell off,
replaced by deep crimson flowers.

The cockroach dismissed her,
and ordered her placed in his pen,
where she transformed into a flowering insect,
providing the food the cockroaches needed
and sparing them endless wars
and pointless battles.

Peace prevailed,
and spring returned as it had been,
with all its varied colours and fragrant blooms.

—

The Secret of the Sickle and the Pots

All the residents of the neighbourhood were asking who had robbed Si Mufaddal's shop — the neighbourhood's sponge-cake seller.

Most were convinced the culprit was Mustafa the Grey. The reason was simple: the man was addicted to hard drugs, and he had done it before to Al-Ayashi the Shaoni, the neighbourhood's tailor. In other words, the accused was there — even if the crime hadn't happened yet.

As for Khadouj the washerwoman, no one suspected her. A woman who washes the dead and leaves houses with her head bowed… how could she carry a sickle or cooking pots?

At dawn, Si Mufaddal entered his shop's storeroom to pray. And in those few moments, Khadouj passed by. She entered… she left… as if nothing had happened.

The sickle disappeared. The pots disappeared. And half a bottle of oil.

The neighbour across the street had glimpsed what happened. But the man was himself occupied with a sensitive operation: removing smuggled red cheese wheels from the front compartment of his car.

He told himself: "O God, cover us in Your veil… today I have no business with anyone."

When Si Mufaddal finished his prayer and began searching for his tools — left, right, nothing — he came out shouting:

"The son of a — did this to me! He did it to me!"

Everyone understood he meant Mustafa the Grey.

Moments later the accused arrived and began swearing oaths, preparing a long sermon on repentance and good conduct.

The neighbour kept quiet. Silence is sometimes the best investment.

The day passed with the neighbourhood feasting on Mustafa's reputation.

In the evening, the neighbour could endure no more. He approached a group of men and said in the tone of one who knows and does not wish to say:

"Some professions are struggling these days… not enough deaths, and medicine keeps advancing. God grant us a better outcome."

Every eye went straight to Khadouj.

Khadouj felt the fire approaching. She adjusted her headscarf and said:

"Anyone who saw something should say it in front of everyone."

The neighbour fell silent. He looked at his car. He remembered the cheese. He knew that if he spoke, Khadouj would speak — and if Khadouj spoke, the customs administration would speak.

At that exact moment a sound came from inside the shop. They rushed in.

They found Si Mufaddal's cat emerging from behind the crates, dragging an oil-soaked rag. And near it… the sickle and the pots.

Si Mufaddal stood dumbfounded. Mustafa burst out laughing until his old remorse showed. The neighbour breathed a sigh of relief.

As for Khadouj, she stood at the door watching.

One of the men said: "Maybe the cat just knocked them over."

Another replied: "Or maybe someone knocked them over and left the cat to take the blame."

Khadouj smiled a small smile as she walked out, and said:

"Even he's looking out for himself…"

And fell silent.

The crowd erupted into hysterical laughter.

As for Mustafa, he kept saying:

"See? The cat is innocent, and I'm innocent… and the thief is among us.
But Mustafa is always first to market: guilty or not — God curse you all!"

—

Faces for the Sun

He turned his back on the sun the moment the emptiness had taken over his pockets. He knew no woman was waiting for him — no one. And each time fear overcame him, he fell to lamenting his ill fortune.

On the first attempt, his feet froze at the station entrance and he could not cross the glass door.

On the second attempt, he hesitated at the last moment and returned the way he had come.

On the third, the two surveillance officers gave him a thorough thrashing and threw him out unceremoniously, having noticed him edging too close to the railway track.

And when his soul drifted slightly from his body — in a moment of remorse and self-reproach — he was struck by a bus whose driver was in an unusual state. The bus threw the upper half of his body to the edge of the road while keeping the lower half beneath its wheels.

A large funeral was organised for him, attended by family and friends, the close and the distant, and some enemies as well. During the funeral, his faults were overlooked, and most of his virtues were mentioned.

And since his pure soul — or so it appeared to his family, at least — had remained free and unaffected by the tragic incident, a rare occurrence in which chance played a large role, it was present at his own funeral.

His soul offered condolences to his family and settled into their dreams, whereupon they hurried to bury him, then turned their faces toward the sun and walked away.`,
  },

  // ─── 2. The City of Two Phases ───────────────────────────────────────────────
  {
    id: "work_city_two_phases", type: "story", accentColor: "#c0392b", readingTime: 10, published: true,
    title: { ar: "مدينة المرحلتين", en: "The City of Two Phases" },
    tag:   { ar: "فانتازيا سياسية", en: "Political Fantasy" },
    bodyAr: `مدينة المرحلتين
محمد الهيشو

مقدمة

ليست كل المدن تُقاس بعدد سكانها.
بعض المدن تُقاس بعدد أحلامها المكبوتة.

هناك مدن تُبنى بالإسمنت،
وأخرى تُبنى بالخوف.

حين يخاف الناس من الحلم،
تولد السلطة كقابلة قانونية للخيال.

هذه حكاية مدينة لم تمنع الأحلام…
بل نظّمتها.

1

في مدينة المرحلتين، لم يكن أحد يعرف متى بدأت المرحلة الأولى. كانوا فقط يعرفون أنهم يعيشون في الثانية. قيل لهم إن الأولى كانت فوضى. وإن الثانية نظام. قيل لهم إن الأحلام حين تُترك حرة تتحول إلى شغب. ولذلك، كان لابد من تدخل حكيم.

في تلك الليلة، حين أسدل الليل سكينه على المدينة، أحست الأحلام بتراخي الأبدان، فانسلّت عبر الشقوق وفتحات النوافذ إلى بيوت المهزومين.

وخلال ساعات قليلة تغيّر كل شيء. هاجر المومس صارت سيدة محترمة، تملك بيتًا دافئًا وأسرة. عيسى العربيد، تاجر الخمور الرخيصة، أصبح مصدر جعة كبيرًا للخارج ورجل أعمال لا يشرب إلا النبيذ الفاخر. المعلم سلطان، المعين في قرية لا تصلها إلا الدواب، صار وزيرًا للتعليم. سوسو فنانة الكباريهات أصبحت الصوت الأول للإذاعة الوطنية. مصطفى الأقرع، العسكري الذي يقضي نهاره في مطاردة الباعة المتجولين، تحول إلى جنرال يحمي الحدود ويحلم بالانقلاب. وقرة قلة الطرماش، تاجر المخدرات الصغير، أصبح نائبًا برلمانيًا ورئيسًا شرفيًا لفريق المدينة. حتى الفقيه رستم، إمام مسجد التوبة القصديري، صار عالمًا كبيرًا ومستشارًا دينيًا في قناة فضائية تابعة لإمارة نفطية.

المدينة كلها حلمت… وارتقت. إلا حلمًا صغيرًا أخطأ الطريق. دخل إسطبلًا مهجورًا يسكنه سعيد السعيد وحماره مومو. تسلل إلى دماغ الحمار. فركض مومو داخل الإسطبل… ونبح.`,
    bodyEn: `The City of Two Phases
Mohammed Al-Hishu

Preface

Not every city is measured by the number of its inhabitants.
Some cities are measured by the number of their suppressed dreams.

There are cities built of concrete,
and others built of fear.

When people are afraid to dream,
power is born as a legal midwife of the imagination.

This is the story of a city that did not ban dreams…
it regulated them.

1

In the City of Two Phases, no one knew when the First Phase had begun. They only knew they were living in the Second. They were told the First was chaos. The Second was order. They were told that dreams left to themselves turn into riots. And so a wise intervention had been necessary.

That night, as darkness drew its silence over the city, the dreams felt the bodies grow slack and slipped in through cracks and window gaps into the homes of the defeated.

Within hours, everything changed. Hajira the prostitute became a respectable lady with a warm home and a family. Issa al-Arabid, the cheap liquor dealer, became a major beer exporter and a businessman who drank only fine wine. Teacher Sultan, posted to a village reachable only by mule, became Minister of Education. Sousoua the cabaret performer became the lead voice of the national radio station. Mustafa the Bald, the soldier who spent his days chasing street vendors, became a general guarding the borders and dreaming of a coup. And Qarat Qalat al-Tarmash, the small-time drug dealer, became a member of parliament and honorary president of the city's football club. Even Faqih Rustem, imam of the tin-roofed Mosque of Repentance, became a great scholar and religious consultant on a satellite channel owned by a petro-emirate.

The whole city dreamed… and rose. Except for one small dream that took the wrong turn. It entered an abandoned stable where Saeed al-Saeed lived with his donkey Momu. The dream seeped into the donkey's brain. Momu ran in circles inside the stable… and barked like a dog.

2

Saeed woke in terror. The braying was never a problem. The city was used to braying. But the barking… that was a transgression.

He poured a bucket of cold water over the donkey's head and shouted a shout that startled the small dream out of Momu. The dream retreated, and Momu returned to his simple donkey-self.

That same night, a total eclipse occurred over the part of the planet occupied by the homeland. The leader broke his silence and gifted the people his dreams. And in the morning, the dreams came true. Everyone became what they had wished for. Except Momu. He remained a donkey, roaming streets that now overflowed with rubbish. But something had changed. The small dream had not left. It stayed close.

3

With time, a friendship solidified between Momu and the dream. The dream began to whisper to him about what happened behind the scenes of the great dreams. It told him that General Mustafa the Bald was planning more than one coup, and that the next eclipse would give him power.

It said: "Think of a bigger dream."

Momu's dream grew. And by chance… he became a delegated minister in the government of President Mustafa the Bald, tasked with overseeing dreams. And so the Ministry of Dreams was born.

4

In the City of Two Phases, every dream now had a form. Every ambition a number. Every hope a signature. A Department of Nightmares was established. A Division for Classifying Aspirations. A Supreme Committee for the Review of Imagination. Unlicensed dreams were a crime. Individual aspirations were a threat to stability.

The people complied. A dream handed down from above seemed safer.

As for Minister Momu — he smiled in meetings. But at night, he heard a faint voice asking him: "When will you dream for yourself?"

5

Then a total eclipse occurred. It was not announced. But the city felt it.

That night the city slept… and no one dreamed. In the morning the people did not go to work. They did not protest. They did not rebel. They simply sat. Quietly. Without dreams. Without illusions.

The Ministry of Dreams was bewildered. Power can crush a dream. But it does not know how to face emptiness.

One of the generals said in an emergency meeting: "The danger is not in the dream… the danger is in people ceasing to desire it."

Everyone fell silent.

As for Momu — he looked at the small dream. It was no longer small. It had become an idea. And ideas do not drown in water.

6

The Third Phase was not officially announced. But it began.

Children stopped reciting their dreams in schools. Workers refused to accept the "weekly dream." Employees returned their ambition forms blank. The people no longer waited for an eclipse.

Momu entered his office and opened the first file in the Ministry's archive. Its title read: "A Donkey's Dream."

He smiled. And on the first page he wrote:

"The Third Phase: When the people discover that a dream cannot be gifted… or regulated… or monitored."

Then he resigned.

He was not arrested. He was not executed. Power does not fear those who resign. But it fears contagion.

And the contagion spread. Not the contagion of rebellion. But the contagion of thinking.

Epilogue

After the Ministry was dissolved, the city did not become a paradise. The rubbish remained. The wires remained. The tired faces remained.

But one thing changed: the dream was no longer a phase. Nor a programme. Nor a speech. It became dangerous… because it was personal.

And in the City of Two Phases, fear had always been collective.

As for Momu — he was no longer a minister. He walked the streets. He looked at the rubbish. Then smiled. Because he was no longer waiting for another eclipse.`,
  },

  // ─── 3. The Purgatory (Al-Barzakh) ──────────────────────────────────────────
  {
    id: "work_barzakh", type: "story", accentColor: "#2c3e50", readingTime: 20, published: true,
    title: { ar: "البرزخ", en: "Purgatory" },
    tag:   { ar: "سردية اجتماعية · ساخرة", en: "Social Narrative · Satirical" },
    bodyAr: `البرزخ
محمد الهيشو

أنا البرزخ.

لا تبحثوا عني في الخرائط كثيرًا، فالخرائط تحب المدن الواضحة، وأنا مدينة ملتبسة. نصف قدمي في البحر، ونصفها الآخر في جيب موظف.

يقولون إنني حدود. وأنا أقول إنني حبل غسيل طويل، تُنشر عليه البضائع كما تُنشر الأحلام، وكل ريح تأخذ نصيبها.

فيَّ يُولد الطفل وهو يعرف اتجاهين:
إما نحو أوروبا…
أو نحو السوق الخلفي.

لا أحد فيَّ عاطل عن الأمل. الأمل عندي يُباع بالكيلو، ويُشحن سرًّا في الليل.

أنا البرزخ. مدينة تصلي الفجر بخشوع، ثم تفتح أبوابها للتهريب بعد الشروق مباشرة. مدينة يغتسل فيها التاجر بماء زمزم، ويغسل أمواله بماء البحر.

لا تسيئوا الظن بي. أنا لا أُفسد أحدًا. أنا فقط أُوفر الظروف المناسبة للبطولة.

فيَّ يصبح اللص كريمًا إذا ذبح خروفين، ويصير المرتشي وطنيًا إذا علّق صورة الملك في مكتبه، ويغدو الداعية حكيمًا إذا قال: «الفتنة نائمة، لعن الله من أيقظها» — حتى لو كانت الفتنة تأخذ قاربًا مطاطيًا كل ليلة.

وأما الشرفاء… فهم زينتي الصامتة. أضعهم في الواجهة كأصص ورد لا يسقيها أحد.

أنا البرزخ. مدينة لا تموت، لأنها لم تعش كاملة يومًا.`,
    bodyEn: `Purgatory
Mohammed Al-Hishu

I am Purgatory.

Do not look for me too often on maps — maps like clear cities, and I am an ambiguous one. Half my foot is in the sea, the other half in a civil servant's pocket.

They say I am a border. I say I am a long clothesline on which goods and dreams are hung out to dry, and every wind takes its share.

In me, children are born already knowing two directions:
either toward Europe…
or toward the black market.

No one in me is idle from hope. Hope here is sold by the kilo and shipped secretly in the night.

I am Purgatory — a city that prays the dawn prayer in reverence, then opens its gates for smuggling immediately after sunrise. A city where the merchant bathes with Zamzam water and launders his money with seawater.

Do not think ill of me. I do not corrupt anyone. I only provide the right conditions for heroism.

In me, the thief becomes generous if he slaughters two sheep. The bribe-taker becomes a patriot if he hangs the king's portrait in his office. The preacher becomes a sage if he says: "Strife is sleeping — God curse whoever wakes it" — even if strife is boarding a rubber dinghy every night.

As for the honourable… they are my silent decoration. I place them in the window like potted flowers that no one waters.

I am Purgatory. A city that does not die, because it has never fully lived.

—

Abd al-Salam

He is my dutiful son. He used to enter his office as if entering a prayer niche. He would arrange his papers, open the window, and lay his palm on the desk the way a believer lays his hand on scripture.

He does not extend his hand to take bribes. He simply leaves it there… and people understand the rest.

He always says: "If I were corrupt, would I fast the entire month of Ramadan?"

He loves to explain his philosophy: "The state does not give me what I deserve, and the citizen wants to take more than he deserves… and I simply restore the balance."

In Purgatory, Abd al-Salam is not base. He is a pillar of equilibrium. Without him, the paperwork would collapse, dreams would stall, and the gap between the law and reality would be exposed… and that is a danger to stability.

I am Purgatory. I protect my children from falling… even if falling is the only honest thing left in them.

—

I am Purgatory. I do not kill anyone with my own hands. I only open doors… and the sea takes care of the rest.

That night the sea was as calm as a sheikh who has had enough sermons. The rubber dinghy was black, resembling a bad idea that had escaped from a young man's angry head.

Fourteen souls — among them two girls no older than seventeen, and a mother standing on the quay waving with a hand that trembled as though signing a contract with the unknown.

The smuggler told her: "Don't worry, Europe is close."

He did not tell her that closeness in Purgatory is a geometric concept only — while at sea it is a mood.

The boat set off. Some neighbours clapped. Success here is measured by how quickly you disappear.

In the morning the sea came back alone. It returned a life jacket, a small shoe, and a fresh rumour.

I am Purgatory. I do not like heavy details. I prefer to summarise tragedies in one sentence: "God's will."

The mother did not weep for long. On the third day she began asking about another smuggler. Because grief in my city does not cancel the dream… it only postpones it.

And in his office overlooking a street that leads to the sea, Abd al-Salam was signing an administrative certificate for another family.

The woman asked: "Is there any hope?"

He smiled. Hope in Purgatory requires an administrative stamp. He gestured gently toward his desk drawer. She understood. She paid. He signed.

When he heard the news of the boat sinking, he shook his head with professional regret. Then he said to his colleague: "The state needs to find a solution for irregular migration."

But that evening, he congratulated his nephew for securing a crossing appointment.

I am Purgatory. A city that grieves quickly… and forgets faster.

—

Hamza

His name is Hamza. A degree in economics, and a precise understanding of how economies collapse.

In Purgatory, a degree does not open a door… it only proves you are qualified to wait.

He used to sit in the same café where Abd al-Salam sat, and Yassin, and sometimes the Sheikh after removing his turban and ordering a strong coffee.

Hamza does not talk much. Those who know the most say the least in Purgatory. Words here are spent like hard currency.

He watched Abd al-Salam justify. He watched Yassin theorise. He watched the Sheikh reassure. And he understood the relationship between them without anyone seeing it.

Abd al-Salam signs. The Sheikh blesses. Yassin directs. And the sea receives.

As for him… he received the awareness.

He tried to resist at first. He wrote short articles under a pseudonym. He spoke of "the parallel economy." Of "laundering the conscience." Of "the city that devours its children." No one read him.

Then Yassin offered him a "organisational opportunity" one evening. "We need someone who understands numbers," he said. "Revolution needs management."

Hamza looked at the sea for a long time. He did not refuse. He did not accept. He only said: "And how much does the revolution pay?"

Yassin laughed. "Enough to live with dignity."

The word dignity pained him. In Purgatory, dignity is used more than it is respected.

In the night he walked alone to the quay. He looked at the water. He felt no fear. He felt indifference. And there lies the danger.

I am Purgatory. I do not fear the angry… I fear those who understand and do not grow angry.

—

Then the explosion came. Not at sea — at the quay.

The rubber dinghy was overloaded. Souls, bags, promises. A small spark from a cheap engine. A sound that did not resemble water. A sound resembling God's slap when He grows weary.

The rubber ignited. People ran. The sea stepped back one pace, as if distancing itself from blame.

Among the passengers was Abd al-Salam's son — his father did not know. He had told him he was going to Tetouan with friends. Also the nephew of Sheikh Mabrok. A quiet young man who prayed in the front row. And two young men from Yassin's "circle." And — worst of all — Hamza was there. He had been released from the holding cell two days earlier on a quiet surety. He had told no one. He had decided to try the sea… not the idea.

Purgatory: I did not light the fire. I only brought them together at one point.

When the dinghy ignited, there was no longer a leftist, or a sheikh, or a civil servant. There was only burning flesh. Screams. Smoke. Phones recording.

Hamza was not on board. He was standing at the quay watching. When it ignited he ran without thinking. He pulled one young man out, then another. He saw Abd al-Salam's son among the injured — he recognised him from the photograph on his father's office desk. He hesitated for a fraction of a second… then carried him.

In that moment he understood something. The city does not need theorising. It needs fracturing.

—

I am Purgatory. A city of no civic life, and preachers who resemble their visions.

Sheikh Mabrok had memorised texts more than he had memorised the names of the poor.

In the Friday sermon after the drowning he said with studied mournful cadence: "Migration is a risk to the soul, and God says: do not cast yourselves into destruction by your own hands."

The people nodded. They were relieved. The fault was now clear: the youth were to blame.

The Sheikh did not mention the smugglers. Did not mention the bribes. Did not mention that one of the prominent philanthropists in the front row financed half the sea crossings.

After prayer he shook Abd al-Salam's hand warmly. The Sheikh whispered: "Stability is a blessing, Si Abd al-Salam… we must preserve it."

Abd al-Salam smiled. He too loves stability. Stability means the drawer stays dry.

And that evening the Sheikh received a generous donation for a new annex to the mosque. The donor was a merchant well known for his love of the sea… at night.

I am Purgatory. I know how to make a Quranic verse walk side by side with a commission. In me, conscience and self-interest shake hands without ever being introduced.

—

After Hamza disappeared — transferred somewhere unknown, released from the holding cell and simply never seen again — the city changed.

The first sign: Abd al-Salam found a note in his locked drawer. A single line in handwriting he recognised. "Stability is the biggest lie in Purgatory." He burned it. But the sentence did not burn.

The second sign: In a Friday sermon, Sheikh Mabrok suddenly stopped. He forgot the next verse. A young man in the second row resembled Hamza too closely. That night he found a message in an email account few knew he used: "When witnesses disappear, the testimony remains."

The third sign: Yassin began receiving anonymous messages. Not threats. Questions. Numbers. Dates. Amounts. The numbers were correct. Someone knew details that few people knew.

I am Purgatory. I do not hide people in vain. Sometimes I rearrange them. Hamza's disappearance was not a drowning… it was a transformation.

And then the contagion spread. A young man in the café suddenly says: "Why is all of this considered normal?" A junior clerk refuses a bribe for the first time. A worshipper asks the Sheikh after the sermon: "Can obedience exist without justice?"

The voices are faint. But they exist. The idea does not die. It only waits for the right circumstance.

And I… am more afraid of circumstances than of the sea.

—

The Final Scene

Night descends slowly over Purgatory. The faint lights of the harbour resemble candles insufficient to bury a city.

A rubber dinghy drifts away. Not the first. Not the last.

Inside it, faces that have not yet learned the difference between hope and illusion. A mother gripping her daughter's hand as though it were an invisible lifeline. A young man looking back… as if saying farewell to himself, not to the city.

Purgatory does not scream. It no longer screams. It only watches.

The sea today is calm. Too calm. It spreads its arms like a tender father. It swallows the dinghy without noise, without bullets, without official statements, without investigation committees. Only small circles on the surface of the water… then they disappear.

In the morning they will say: "Irregular migration attempt."

And people will go on with their lives. Abd al-Salam will open his office. The man of religion will recite his sermon. The merchant will count his profits. And the activist will wait for new funding.

As for the sea… it will remain there, its blue mouth open, eating more souls and returning to Purgatory its heavy silence.

And no one knows whether the sea is a cemetery… or a mirror.`,
  },

  // ─── 4. The Sea That Does Not Close ─────────────────────────────────────────
  {
    id: "work_sea_no_close", type: "novel", accentColor: "#1a5276", readingTime: 30, published: true,
    title: { ar: "البحر الذي لا يُغلق", en: "The Sea That Does Not Close" },
    tag:   { ar: "رواية تأملية", en: "Meditative Novel" },
    bodyAr: `البحر الذي لا يُغلق
رواية
محمد الهيشو

إهداء

إلى الذين عبروا وظلّت أسماؤهم معلّقة بين ماءين.
وإلى الذين ورثوا المفاتيح دون أن يعرفوا أين الباب.

ليس البحر حدًّا بين مكانين،
بل ذاكرة لا تنام.

الفصل الأول — القارب الذي لم يتحرك بعد

لم يخبر أحدًا أنه سيغادر.

البيت كان نائمًا، أو يتظاهر بذلك. الجدران في هذه القرى الجبلية لا تنام؛ هي تحفظ الهمس كما تحفظ الرطوبة.

من النافذة الصغيرة كان يرى ضوءًا بعيدًا، لا يعرف إن كان صادرًا من الضفة الأخرى أم من سفينة تائهة في الظلام. في طفولته كانوا يسمّون تلك الأضواء «العدوة». كانوا يشيرون بإصبع مرتجف نحو الشمال ويقولون: هناك... هناك بلادنا.

لم يفهم يومها كيف يمكن أن تكون البلاد هناك، وهو هنا.`,
    bodyEn: `The Sea That Does Not Close
A Novel
Mohammed Al-Hishu

Dedication

To those who crossed, whose names remain suspended between two waters.
And to those who inherited the keys without knowing where the door is.

The sea is not a boundary between two places.
It is a memory that does not sleep.

Chapter One — The Boat That Has Not Yet Moved

He told no one he was leaving.

The house was asleep — or pretending to be. Walls in these mountain villages do not sleep; they hold whispers the way they hold damp.

Through the small window he could see a distant light, not knowing whether it came from the other shore or from a ship adrift in the darkness. In his childhood they used to call those lights "the enemy shore." They would point with a trembling finger toward the north and say: there… there is our land.

He never understood then how the land could be there, when he was here.

He opened the wardrobe quietly. He did not take much. Documents, a light jacket, an old photograph of his grandfather.

The grandfather stood on a rock, the sea behind him, looking as though he were waiting for something that would never arrive. On the back of the photograph, in faded handwriting, a single word: "We will return."

He did not know where to.

In the kitchen, the refrigerator hummed like an old man who cannot sleep. He passed his mother's bedroom door. He stopped. He nearly knocked. But he was afraid she would open for him all of history at once.

He pushed open the front door slowly. The cold air received him without questions.

Below, at the bend that slopes toward the coastal road, a man was waiting — he did not know his real name. In these areas, names are temporary. People are known by their faces, or by their roles: this one is a middleman. This one is a guard. This one came back. This one didn't.

"You're late," the man said.

He only nodded. He was not thinking about Spain. Not thinking about the south, the work, the money. He was thinking of a single word that had pursued him since childhood: the stranger.

They used to apply it to his grandfather when he spoke the old Spanish. They applied it to his father when he insisted they had land on the other shore. And they applied it to him when he said he did not feel he fully belonged here, nor there.

At the small harbour, the rubber dinghy lay deflated on the sand like a creature breathing with difficulty. Five men waiting. No one looking anyone in the eye.

When they pushed it into the water, he felt something move in his chest. Not fear. Not excitement. Something older.

As the boat pulled away, he turned toward the mountain. The houses became dark points. The village where he was born suddenly looked temporary.

He whispered, without meaning to: "Did a young man named Al-Kamil ever pass this way?"

No one heard him.

The engine finally started. The boat moved. But in the moment it separated from the shore, he was not sure whether he was leaving… or completing a road that had begun five centuries ago, when Granada fell and the longing did not.

—

Chapter Two — The Name

In open water, names grow lighter than water.

They had not gone far from the shore when the man steering the boat asked them to surrender their ID cards into a plastic bag. He said in a businesslike voice: "If something happens… it's better they don't know who you are."

Someone laughed a short laugh, then swallowed it. "As if we know."

He took out his ID slowly. He studied the name as though seeing it for the first time. It was long, tired, carrying more than a small line of plastic could hold.

He remembered the day the history teacher at secondary school asked him: "Your name is unusual… where are you originally from?"

He answered with a ready reply: "From here." But the teacher smiled the smile of someone who knows "here" is not always enough.

The engine groaned. The sea was not stormy but not calm either. The water was black, as though erasing whatever fell into it.

A thin young man sat beside him, trembling despite the cold not being harsh. He said in a low voice: "Your name?"

He hesitated. He could have said the name on the card. Could have chosen a false name. Could have kept silent. He finally said: "Call me… whatever you like."

The young man looked at him for a long time, then said: "We're all nameless here."

He suddenly thought of Al-Kamil. He imagined the moment of his return to Seville after years of absence. He imagined people pronouncing his name slowly, as though it were foreign in their mouths. He imagined how the name had transformed from a mark of belonging to evidence of suspicion.

Had Al-Kamil felt that same weight? Had he held his card — if he had a card — and wondered: who am I if they don't recognise me?

A voice behind him whispered a verse. Another muttered in Spanish. Languages mingling with languages, as if the sea itself did not choose a single tongue.

He remembered his grandfather saying: "We are not fully Moroccan and not fully Spanish. We are something between the two… like this sea."

He used to hate that sentence. It made him feel like half of something, always. But in this moment, in this darkness, the "between" seemed more real than any land.

—

Chapter Four — The Light That Does Not Guide

The light drew close until it became an open eye in the darkness. It was not a shore. Not a dawn. It was moving.

"Patrol…" the driver whispered, and his voice dropped as though the sea itself might hear.

Bodies stiffened all at once. The men who moments before had been imagining the shore were now imagining questions. The names they had tried to forget came back suddenly, clear and heavy.

The driver cut the engine. The boat became a body without a pulse. They were drifting with the wave, like a piece of shadow.

The light passed at a distance, drew a little closer, then moved away. No one breathed until it disappeared.

When the engine returned to life, it was no longer the same. It sounded more like a decision.

The water began to ease. The darkness was no longer total. There was a grey line in the distance, barely visible, but steady.

"Land," someone said — this time without whispering.

No one clapped. No one wept. As though they did not trust the arrival until their feet touched sand.

As they approached, details took shape. White houses set apart. A small jetty. Dark rocks. The scene was not heroic. No music. No welcome. Only cold ground waiting for hesitant feet.

The first man jumped. Then the second.

When his turn came, he felt a strange weight in his legs, as though the sea had not yet emptied from him. When his foot touched the sand, he felt no victory. Only that something had shifted… and something else had begun.

He turned to the sea. There, behind the darkness that had grown less dark, he imagined the mountain. The village. The house he had left hours ago. Hours only… yet the time felt longer than five centuries.

—

Chapter Five — The City That Does Not Remember

He entered the city as one enters an old idea.

There was no guard at the entrance, no sign saying: Welcome back. Only streets waking slowly, and bakeries opening their doors to the smell of bread not so different from the bread of the mountain.

He stopped in front of a glass shop front with a sign that read: Bar Andalucía.

He smiled without meaning to. The name seemed to call from another time.

He pushed the door open. A soft chime announced his entry.

A man in his fifties, with a pale face and tired eyes, looked up. "¿De dónde eres?" — Where are you from?

The question arrived simply. But he felt it like an old knife. He hesitated. He could have said: from Morocco. From the north. He could have named the village he had left hours ago. But he said, without planning: "From here… in a way."

The man laughed. A short laugh, without mockery. "Everyone says that."

He sat in a corner near the window. He ordered coffee.

An elderly man came in, with a dark cap and a light cane. He sat nearby. He looked at him for a long time. Then said in broken Arabic: "You… from the other shore."

It was not a question. He stiffened slightly. "How did you know?"

The old man smiled. "The eye. The sea's eye does not mistake."

They were silent for a moment. Then the man added: "My grandmother used to say we had family over there. In the mountains. We called them… the people of the enemy shore."

Something trembled inside him. "The enemy shore…" he repeated it slowly, as though confirming the pronunciation.

The old man nodded. "Yes. We thought we had lost them. But it seems you are the ones who lost the way."

There was no accusation in his words. Only a faint sorrow, like old dust.

He left the café feeling the ground was not as solid as it seemed. The city did not remember him, but he was not entirely foreign to it. The names here were Spanish, but their sound in his ear was not distant.

He passed through a narrow alley where an old wall bore the traces of a worn inscription. He drew closer. It was no longer clear what had been written. But the script, despite its defacement, looked Arabic. He ran his fingertips along the letters. He felt a faint warmth, as though the words still lived beneath the stone.

In that moment he understood something small and earth-shattering: cities do not forget. They only change their language. The forgetting is not in the stone — it is in people.

—

Chapter Eight — The Stone That Speaks

On the third night he did not return to his small room.

He walked alone. He wanted to see the city without mediation. Without work. Without voices.

He followed a narrow alley leading toward the old quarter. The walls close together, the high windows like half-closed eyes.

He stopped before an ancient stone arch. Part of an old building, now a small storeroom.

He drew close. On one of the stones, the trace of a worn inscription. Not fully clear. But the script, despite what had erased it, was not Latin.

He extended his hand. He touched the stone as one might touch the shoulder of a man never met. He felt a faint shiver.

In his mind a complete image formed. Al-Kamil walking here. Young, full of the idea of return. Then a man, laden with a disappointment he did not know how to name. Had he passed through this arch? Had he touched this stone?

"These are the remains of another time."

The voice came from behind him. He turned. An elderly woman, carrying a small basket, watching him without fear.

"Which time?" he asked.

She smiled. "A time when people prayed here in a different language." She paused, then added: "But the city does not like to remember too much."

He looked at her intently. "And you?"

She shrugged. "I've lived here fifty years. I learned that stone is more honest than people."

She walked slowly, then stopped. "You're not a tourist." He did not answer. "Your face says you're looking for something you didn't live."

He hesitated, then said: "I'm looking for a trace."

She nodded. "The trace is not seen with the eye. It is carried." Then she walked on.

He stood alone. He understood suddenly that the problem was not that Andalusia had fallen, nor that people had been expelled, nor that the sea had become a border. The problem was that the story had not been properly ended. It had been left open. Passed down through generations like a debt without a receipt.

—

Chapter Ten — The Man Who Waited

He had not gone to the restaurant directly. His steps led him to the harbour, as if the sea had become an internal address that needed no map.

The morning was a light grey, and the fishermen were unpicking their nets with ancient patience. The gulls screamed above the water, as though preserving the names of all who had passed here.

He saw him before he approached. The same man who had sat in the restaurant corner days ago. The thin face, the deep eyes, a dark cap tilted slightly to the right. He was standing at the edge of the stone quay, looking at the sea as though in conversation with it.

He stopped at a distance.

"I knew you would come," the man said without turning.

He drew close. "They said you were asking about me."

The man turned his face toward him slowly. "I wasn't asking about you. I was asking about the name."

"Which name?"

"The one you carry… and the one you don't."

They sat on the edge of the quay. The water struck the stone in a steady rhythm, like a clock that never stops.

"My grandfather came from there," said the man, gesturing south. "He was a child when he crossed. He didn't understand why the adults wept watching the shore recede." He paused, then added: "He said they weren't weeping because they were leaving… but because they didn't know whether they would be allowed to remember."

He looked at him for a long time. "And why do you wait for me?"

The man smiled. "Because you carry the same question."

He took the old photograph from his pocket and handed it to the man. He studied it carefully. "The face… yes."

"What?"

"This face has passed through the stories."

Something incomprehensible trembled inside him. "Which stories?"

The man sighed. "In our family there is a story about a young man who returned after years and did not find the city as he had left it. He worked in a small bar, wrote at night, and said: 'I do not want to reclaim the land — I only want the meaning not to disappear.'"

He stopped. Then looked at him directly. "The name of that young man… was Al-Kamil."

The voice that had lived inside him for weeks was suddenly clear. Not illusion. Not projection. Not manufactured longing. The story was alive here too. On the other shore.

"And what became of him?" he asked in a low voice.

The man shrugged. "My grandmother said only one thing."

"What?"

"She said he did not disappear. She said he became a road."

A long silence. The sea before them was calm now, but the depth could not be seen.

"Why do you tell me this?" he finally asked.

The man looked at the horizon. "Because a story does not like to remain incomplete. Every generation is asked to write another line." He turned to him. "And you arrived at the right time."

"For what?"

The man smiled a faint smile, as if it carried a simple secret. "To choose."

"Choose what?"

"To live here as any migrant, and let the story wither in your chest… or give it a voice."

—

Chapter Twelve — The Echo That Writes

He did not sleep that night.

The manuscript before him, his notebook open, the window half open onto a sea that could not be seen but could be heard.

Each time he read a line from Al-Kamil, he felt the words did not describe the past — they explained what was happening to him now.

"Exile is not in a place, but in the voice that finds no one to believe it."

He read the sentence three times. Then wrote beneath it: "I believe you."

He stopped. Was he writing to Al-Kamil? Or to himself? The difference was no longer clear.

In the final pages of the manuscript the handwriting changed. It became more trembling, more rushed.

"If I return south, it is not to reclaim land, but to return the story to its people."

He lingered on this sentence for a long time. Did he go south? Did Al-Kamil actually return?

There was no answer. The last page was torn at the edge. As though someone had ripped off the ending.

He closed the manuscript slowly. "Why was it left unfinished?" he whispered.

As if the sea answered from afar: "Because you had not yet been born."

—

Chapter Fourteen — Between Two Shores

Weeks passed. Reading had become a habit. The small house had become a window.

One evening, after he had finished reading, a young man asked him: "Has the story ended?"

He looked at the manuscript. At the page he had completed in his own pen. At the eyes waiting.

He smiled. "A story does not end. It only changes its narrator."

That night he did not go home directly. He climbed the hill overlooking the valley. He sat where he used to sit as a child. The wind passed through the grass, and the sky was open without borders.

He took out his phone. He wrote a message to Miguel: "The story has arrived. But it has not closed."

A few minutes later the reply came: "The sea has not closed either."

He put the phone away. He raised his head toward the horizon. He knew he would return north again. Not to search, not to flee, but to carry what had been written here to there. And that was not a contradiction. It was completion.

A month later, he was standing before the sea again. The southern shore behind him this time, the north ahead. A small boat waiting. Young uncertain faces. Eyes full of fear and desire.

One of them asked him: "Have you crossed before?"

He looked at the horizon. He remembered the bar. The harbour. Miguel's house. The manuscript. His grandfather's grave. The evenings in the mud-brick house. Then said quietly: "We are always on the way."

The boat moved. The water opened slowly, like a new page.

He did not know how the ending would be this time. Whether they would arrive safely. Whether someone would stop them. Whether they would return.

The question no longer mattered in the same way. What mattered was that the story was no longer silent. That the voice had found someone to carry it. That the two shores were no longer enemies, but two lines in a single book.

Night began to fall. The engine quieted a little. The faces were silent.

Someone whispered: "Are we close?"

He looked at the darkness ahead, at the distant light that might be a shore or a ship. Then said: "We are not getting close to a place… we are getting close to ourselves."

And the sea, as always, did not answer. But it did not close.`,
  },

  // ─── 5. Akhimido (Historical Novel) ─────────────────────────────────────────
  {
    id: "work_akhimido", type: "novel", accentColor: "#7a3b1e", readingTime: 40, published: true,
    title: { ar: "أخيميدو", en: "Akhimido" },
    tag:   { ar: "رواية تاريخية", en: "Historical Novel" },
    bodyAr: `أخيميدو
رواية
محمد الهيشو

إهداء

إلى الذين حملوا مفاتيحهم قرونًا دون أن يعودوا، لكنهم لم ينسوا.
إلى الياقوت التي تنتظر على الصخرة.
وإلى بيير الذي علم أن التاريخ يُروى بالحبر قبل الدم.
وإلى أنجرة، حيث الجبال تحفظ ما تنساه المدن.

مفتتح

«البحر لا يفصل بين الضفتين…
هو فقط يذكّرهما بأنهما كانتا واحدة.»

تمهيد

هذه الرواية لا تروي سيرة رجل واحد، بل سيرة ذاكرة جماعية تنفست قرونًا بين ضفتين.

إنها حكاية آلاف المغاربة الذين وجدوا أنفسهم مُجَنَّدين في حروب لم يختاروها، وحملوا في جيوبهم مفاتيح بيوت لم يعودوا إليها، وأسماءً كُتبت بحرفين: عربي في الروح، إسباني على الورق.

الفصل الأول — المفتاح الذي لا يصدأ

لم يكن المفتاح صدئًا.

كان أثقل مما ينبغي، كأن الحديد امتص عبر القرون وزن الأبواب التي أُغلقت خلفه، واحتفظ بصمت البيوت التي لم تُفتح مرة أخرى.

وقف حميدو على حافة الميناء في طنجة الدولية. لم يكن يقف كمسافر، بل كمن يختبر المسافة بين شيئين داخله. البحر أمامه لم يكن فاصلًا، بل مرآة مضطربة. لم يكن ينظر إلى إسبانيا بوصفها دولة، بل كأرض تغير اسمها أكثر من مرة، بينما ظلت الذاكرة تناديها باسم واحد: الأندلس.

قال له بحار عجوز ذات مساء بعيد، وهما يتقاسمان الشاي قرب الرصيف:
«البحر لا يفصل بين الضفتين… هو فقط يذكّرهما بأنهما كانتا واحدة.»

لم ينس الجملة. احتفظ بها كما احتفظ بالمفتاح.`,
    bodyEn: `Akhimido
A Novel
Mohammed Al-Hishu

Dedication

To those who carried their keys for centuries without returning, yet never forgot.
To Yaqut, who waits on the rock.
And to Pierre, who knew that history is written in ink before it is written in blood.
And to Anjra, where the mountains preserve what cities forget.

Epigraph

"The sea does not separate the two shores…
it only reminds them that they were once one."

Preface

This novel does not tell the story of a single man, but of a collective memory that breathed for centuries between two shores.

It is the story of thousands of Moroccans who found themselves conscripted into wars they did not choose, who carried in their pockets the keys to homes they never returned to, and names written in two scripts: Arabic in the soul, Spanish on paper.

In Akhimido, the individual voice interweaves with the whisper of the community, and the life of a peasant from the mountains of Anjra entangles with the currents of greater history: the fall of Andalusia, the Spanish Protectorate in the north, the Spanish Civil War, then the independence that redrew maps as it reshaped memory.

Between Tangier and Fes, between Ceuta and Granada, our hero walks carrying a key that does not rust and a question that does not die:

How do we preserve our identity when the land is taken from us?
And how do we write our history in letters the wind cannot erase?

Chapter One — The Key That Does Not Rust

The key was not rusted.

It was heavier than it should have been — as if the iron had absorbed across the centuries the weight of the doors that had closed behind it, retaining the silence of houses never reopened.

Hamidu stood at the edge of the harbour in International Tangier. He was not standing as a traveller, but as someone measuring the distance between two things inside himself. The sea before him was not a dividing line but a turbulent mirror. He did not look at Spain as a country, but as a land that had changed its name more than once while memory kept calling it by a single name: Andalusia.

An old sailor told him one distant evening, as they shared tea by the quayside:

"The sea does not separate the two shores… it only reminds them that they were once one."

He never forgot the sentence. He kept it the way he kept the key.

He was around forty, but his features would not settle into any particular age. In his face something of the mountain, in his eyes something of the sea, and in his silence the residue of old books no one read anymore.

In his left pocket, his grandfather's key. In his right pocket, a small paper written in a language most people could not understand — half Arabic, half Spanish, all of it ancient fear.

The Akhimido.

When he was a child he had not understood why the grandfather whispered the word as though it were a secret. He would pronounce it slowly, as if each letter carried a hunted memory.

He told him one night:

"They used to write Spanish in Arabic letters… so they would not be discovered. They hid their names inside the language, the way a knife is hidden inside a loaf of bread."

In the old manuscripts the name was written: Akhimido. But on the birth certificate, and in his mother's calls when he stayed too long in the mountains, he was Ahmad.

The name was not a division but another layer of existence.

And when he returned from the war, he was not returning to a geographical homeland, but to a question.

The Spanish Civil War was not distant as people thought. Its spark had flown from northern Morocco — a rebellion led by General Francisco Franco — and the battalions surged from Ceuta and Tetouan toward the peninsula. Hamidu was one of them. Conscripted by force.

They did not ask about his studies at the Qarawiyyin, nor about the manuscripts, nor about Yaqut.

They asked him one question: "Can you carry a weapon?"

He fought at first without understanding. Then he understood… and fled.

And now, standing in Tangier, he was closer to Anjra than he had ever been, and at the same time further from it. He could not enter openly — the region was still under Spanish protection, and he was a deserter from its army.

He took the key from his pocket. It was not rusted. Not worn. Not faded.

He said to himself: "Perhaps this was not made to open a door in Andalusia… perhaps it was made to open a door inside me."

A breeze came from the direction of the Strait, carrying the smell of the mountain.

And for the first time, he did not think of the other shore. He thought of returning to himself.

—

Chapter Two — Hamlets That Bear Names That Do Not Die

In Anjra, stories do not begin with people. They begin with the land.

Between Ceuta and Tangier, passing through the outskirts of Tetouan, where the mountains wrap around the sea like an arm trying to shelter a child from the wind, small hamlets are scattered with names larger than their size: Al-Zahira, Al-Mansura, Al-Daliya, Al-Houma, Dar Qashana, Al-Dhahir, Al-Khamis.

The people knew the land by name, the stone by touch, the sea by its sound in the night.

The tribe of Anjra was not merely a social division but layers of memory. Every house bears the trace of a story, and every story extends centuries back, as though time in the mountain does not pass but accumulates.

The White House

Hamidu was born in a low-ceilinged white house whose walls cracked in winter then dried in summer as though they had not suffered.

His father was a farmer who knew rain better than he knew politics, who read clouds the way others read newspapers.

As for the grandfather — he was memory walking on two feet.

He would open an old wooden chest whenever nostalgia weighed too heavily.

Manuscripts, yellowed papers written in a hybrid language:

"Nos quitaron la casa… pero no la memoria."
They took the house from us… but not the memory.

From that night on, the name accompanied him: Akhimido. He did not understand everything, but he felt the house held a secret larger than its walls, and that the key the grandfather kept was not mere iron but a testament.

—

Yaqut

Before Fes, there was Yaqut. His cousin, living in a nearby hamlet, walking with the lightness of one who knows the way without looking at her feet.

Between them was no love story as songs tell it, but a long silence full of understanding.

They would sit on a rock overlooking the Strait.

She would be silent, and he would speak of Andalusia.

She said to him once, gazing at the other shore: "Why do you speak of it as though you will return?"

He answered without turning: "Because those who stop dreaming of return… die twice."

She did not reply. But she began to fear his dream. She knew Andalusia was not only a place but an abyss that could swallow those who stared into it too long.

—

Chapter Three — The Road to Fes

The journey to Fes was not a sudden decision but a slow slide toward an unnamed fate.

He woke before dawn. He woke no one. Houses in villages know when a son prepares to leave — they fall suddenly silent, as if holding their breath so as not to hear the final footsteps.

He carried the key in his pocket — not to open a door, but to give him a weight that would protect him from weightlessness. He was afraid of becoming an idea without roots.

He passed the field his father used to till, and touched the fig tree in whose shade he used to rest. He placed his palm on its trunk as one places a hand on the shoulder of an elder being bid farewell.

He said nothing. But the tree understood.

On the bus heading south, faces looking for something: work, a certificate, salvation, or simply a chance to delay the fall. He sat near the window. With each mile the village receded, he felt something being torn from inside him. But in the depths, there was a faint call — the voice of an ancient city calling him by a name not yet born.

When the minarets of Fes appeared on the horizon, he felt he was entering an old book. The high walls were not walls but calcified memory. The narrow alleys were arteries, and the city a heart beating with ancient ink.

He entered the Qarawiyyin Mosque as a student of knowledge, not a student of status. He was not like the other students. He asked questions that unsettled the scholars:

"Is jurisprudence alone sufficient to restore the dignity of the displaced?"

"Is it enough to memorise texts if the land is lost?"

Some looked at him with suspicion; some saw in him a legitimate anxiety. But he was not seeking debate. He was looking for an answer to something that had lived in him since childhood.

In the evenings he entered a Sufi lodge near the quarter. He was not religious in the conventional way, but he was searching for a mirror for his soul. He sat among men chanting litanies. The words were not merely sounds but degrees descending to the floor of the heart.

For the first time since he had carried the key, he felt the iron in his pocket grow lighter. As though the burden was not in the weight but in the meaning it carried.

He left the lodge that night knowing that knowledge is not only books, but also stillness.

—

Chapter Four — The Return That Preceded the Storm (1932–1939)

He returned to Anjra after years of study, one morning saturated with the smell of salt.

He saw the hamlets from a distance: Al-Zahira, Al-Mansura, Al-Daliya, Dar Qashana. The names the same, but the air heavier, as if something was preparing to fracture.

His father received him with a long silence. Not a man of embraces, but his eyes said enough. Then he held him briefly and stepped away, as if emotion weakened him.

As for the grandfather — he was frailer than he had left him. Hamidu sat beside him and placed between his hands the manuscripts he had taken to Fes. The old man smiled a faint smile and said:

"You did not take them to return them… but to complete them."

Then he added after a deep silence: "Beware, Hamidu. One who knows his history well… becomes dangerous."

He did not fully understand the warning. But the days would explain it in blood and gunpowder.

Yaqut was waiting for him. She did not run toward him, did not weep. She stood as he had known her, steady as an olive trunk.

He said smiling: "I have returned as a scholar."

She looked at him for a long time and asked: "And have you remained as you were?"

He hesitated a moment. "I don't know."

They sat at the rock overlooking the Strait. The other shore was unusually clear that day.

He said in a low voice: "I walked on their soil… over the land of Andalusia."

She turned to him in amazement. "And what did you find?"

He answered after a silence: "I found stone that knows me… and does not recognise me."

—

Chapter Five — When the Stone Knew Him

The ship arrived at dawn.

He did not feel he was entering enemy territory but the territory of memory. The houses white, the balconies iron-black, the arches semi-circular. Something in the architecture resembled the hamlets of Anjra, but in an older and more painfully familiar form.

In one of the patrols they passed an old village. His heart stopped when he saw a faded Arabic inscription above an abandoned door. He drew close and ran his fingers over the letters. Remnants of "Bismillah."

He trembled. How many soldiers had passed here without noticing? How many stones know the story and cannot speak?

In the markets he began to hear words that resembled the dialect of Anjra:

aceituna — the olive
acequia — the irrigation channel
ojalá — in sha' Allah

He heard Arabic hiding inside Spanish. He remembered the old manuscript:

"Nos quitaron la casa… pero no la memoria."

He suddenly understood that memory had not died. It had only changed its skin.

Then he witnessed a village being bombarded. Women screaming. Children hiding under rubble.

In that moment, all justifications fell away. He returned to the camp at night and took out a paper on which he wrote in Akhimido:

Yo no soy soldado del olvido.
I am not a soldier of forgetting.

He stared at it for a long time. Then made his decision.

The escape was not heroism but a gamble with life. He used his knowledge of mountain passes as he had in the mountains of Anjra. He slipped away at night, aided by the silence he had learned from the sea. After days of hiding he met a group of Republican fighters. They were exhausted and torn but fighting fascism.

They asked him: "Will you fight with us?"

He hesitated for a moment, then said: "I will fight against injustice."

—

Chapter Six — Pierre

There he met a different kind of man. A learned Frenchman who carried a book more than a weapon. His name was Pierre.

He was interested in the history of Muslims in Spain. And when he learned that Hamidu was from Anjra and that his ancestors were Moriscos, his eyes widened with astonishment.

He said: "You are the living survivors of an unfinished story."

He began telling him of archives in Paris, documents about the migration of the Moriscos to Morocco and Latin America.

One night he said: "History is not reclaimed only by arms… but by narration."

That sentence was more dangerous than any rifle.

In the evenings of short truces, Pierre taught Hamidu how to read history another way. He said one night as they stared into the camp fire:

"You Moriscos are not merely victims of history. You are witnesses to it. What is happening to you now in this war happened to your ancestors four centuries ago. The only difference is that the borders have changed, but the fear is the same."

Hamidu kept those words. He felt they were the true key — not to the house he carried a key for in his pocket, but to understanding his whole life.

—

Chapter Seven — Return to Exile

When his feet touched the ground of Tangier again, he did not feel he had returned to a homeland. He felt like someone who had come back from the dead to find life had continued without him.

He did not go directly to Anjra. He stayed in Tangier with a maternal uncle who worked in trade. There he began to hear the news.

Franco had won conclusively in Spain. The northern zone remained under Spanish protection. Deserters from the army were being hunted.

He was not safe.

He spent months in hiding. He went out only at night, meeting those he trusted, asking about Anjra, about Yaqut, about his family.

The news came to him one evening from a fish seller: "Your father is well. Your grandfather died a year ago. And Yaqut… they say she is ill."

He did not wait any longer.

He entered Anjra secretly, like someone entering a dream. Everything as it was… yet different. The same houses, the same roads, but the faces of the people had changed. In them suspicion, and in them fear.

He arrived at the white house at dusk. His father was sitting at the door. He looked at him for a long time, said nothing, then stood and threw the door open wide.

That night they did not speak much. Silence was sufficient.

In the morning Hamidu asked about Yaqut. His father looked at him with sorrow: "She is in her family's house. She has been ill for months. She has not asked about you much… but she has not forgotten you."

He went to her the next day. She was sitting in the courtyard under a fig tree. Her face pale, but her eyes as they had always been: deep, calm, knowing more than they spoke.

He sat before her. A long silence.

Then she said: "You returned."

He said: "I returned."

She asked: "Has the war ended?"

He answered: "One war there has ended. A war here has begun."

She understood what he meant.

—

Chapter Eight — Yaqut's Departure

After a few days, she departed.

It was not a dramatic death. There was no screaming. It was a quiet extinguishing, like a candle that had fulfilled its purpose.

But something inside him broke.

He buried her on a hill overlooking the Strait. He chose a place from which both shores could be seen.

He said as he laid the last earth: "I did not reclaim Andalusia… but I reclaimed myself."

—

Chapter Nine — Who Finds the Key

Years passed. No one called him Hamidu anymore. They called him: Faqih Ahmad.

But in his notebooks the name remained as it was: Akhimido.

His hair whitened, his steps slowed, but his voice remained as quiet as people had always known it.

He no longer spoke much about the war. He spoke of words.

He collected words in a small notebook:

"Qashqula"… "al-Saqiya"… "al-Zahira"…

And beside each, he wrote its origins, its transformations, its journey from Andalusia to Anjra.

He used to say to the young: "History does not dwell in palaces alone… it dwells in your mouths."

He gathered the stories. He wrote about the Moriscos who settled in the north. He recorded the words of the Akhimido. He taught children that names are not accidents.

And he would say to them: "If your house is stolen from you… do not allow your memory to be stolen."

He signed his books with the name: Akhimido.

—

The Ending

Hamidu was buried on the hill he had loved, overlooking the Strait, where Yaqut used to sit and wait.

His notebooks remained as witnesses to his story. And his key continued to be passed among the people of Anjra.

Some said it was a real key to a house in Andalusia. Others said it was mere old iron. But the children who had learned from him began to tell the story:

That the key did not open a door. It opened a question.

And the hamlets of Anjra continued to bear the names of Andalusia:
Al-Zahira, Al-Mansura, Al-Daliya, Al-Hijayra, Al-Houma.

And the sea went on watching the two shores — not separating them, but reminding them they were once one.

And whenever someone sat at the Strait and contemplated the other shore, they remembered the words of the old sailor:

"The sea does not separate the two shores. It only reminds them that they were once one."

And they remembered Akhimido.

The man whose name was Ahmad, but who chose to remain… Akhimido.`,
  },
];
