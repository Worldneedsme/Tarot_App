// Kural tabanlı yorum motoru.
// Kartları tek tek değil, birbirleriyle ilişkileri üzerinden okur:
// ton yayı, element uyumu, sayı ilerleyişi, takım geçişleri, Büyük Arkana,
// ters kartlar, saray kartları ve bilinen kart ikilileri.
// Her cümlenin birkaç yazılışı var; aynı durum tekrar geldiğinde sıradaki yazılış kullanılır.
(function () {
  /* ---------- Yazılış seçimi ---------- */
  // Her anahtar için en son kullanılan yazılış hatırlanır, bir sonrakinde sıradaki seçilir.
  const MEM_KEY = 'tarot.variants';
  let mem = {};
  try { mem = JSON.parse(localStorage.getItem(MEM_KEY) || '{}'); } catch { mem = {}; }
  const saveMem = () => { try { localStorage.setItem(MEM_KEY, JSON.stringify(mem)); } catch { /* yok say */ } };

  // fixedSeed verilirse hafıza kullanılmaz (eski günlük kayıtlarını her açışta aynı göstermek için)
  let fixedSeed = null;
  function v(key, options) {
    const n = options.length;
    if (n === 1) return options[0];
    if (fixedSeed !== null) {
      let h = fixedSeed;
      for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      return options[h % n];
    }
    const i = key in mem ? (mem[key] + 1) % n : Math.floor(Math.random() * n);
    mem[key] = i;
    return options[i];
  }

  /* ---------- Kart özellikleri ---------- */
  // Büyük Arkana'nın astrolojik elementleri (Golden Dawn geleneği)
  const MAJOR_ELEMENT = ['air', 'air', 'water', 'earth', 'fire', 'earth', 'air', 'water', 'fire', 'earth', 'fire',
    'air', 'water', 'water', 'fire', 'earth', 'fire', 'air', 'water', 'fire', 'fire', 'earth'];
  const SUIT_ELEMENT = { wands: 'fire', cups: 'water', swords: 'air', pentacles: 'earth' };
  const ELEMENT_NAME = { fire: 'Ateş', water: 'Su', air: 'Hava', earth: 'Toprak' };

  // Ton: 1 olumlu, 0 nötr, -1 zorlayıcı (düz hâl için)
  const MAJOR_TONE = [1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, -1, 1, -1, -1, 1, -1, 1, 1, 1];
  const MINOR_TONE = {
    wands:     [1, 0, 1, 1, -1, 1, 0, 1, 0, -1, 1, 1, 1, 1],
    cups:      [1, 1, 1, -1, -1, 1, 0, 0, 1, 1, 1, 1, 1, 1],
    swords:    [1, -1, -1, 0, -1, 0, -1, -1, -1, -1, 0, 0, 0, 0],
    pentacles: [1, 0, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1, 1, 1],
  };

  const NUMBER_STAGE = {
    1: 'tohum ve başlangıç', 2: 'seçim ve denge', 3: 'büyüme ve ilk sonuçlar', 4: 'istikrar ve durgunluk',
    5: 'çatışma ve kriz', 6: 'uyum ve toparlanma', 7: 'sınanma ve değerlendirme', 8: 'hareket ve ustalık',
    9: 'doruk ve son aşama', 10: 'tamamlanma ve döngünün sonu',
  };
  const COURT_PERSON = {
    11: ['meraklı, öğrenmeye açık genç bir enerji ya da yeni bir haber', 'yeni başlayan, heyecanlı biri ya da gelecek bir mesaj', 'genç ruhlu, keşfetmeye açık biri ya da beklenmedik bir haber', `öğrenmeye hevesli genç biri ya da yolda olan bir haber`],
    12: ['hızlı hareket eden, atılgan biri', 'harekete geçmekten çekinmeyen, tutkulu biri', 'bir anda hayatına giren, enerjik biri', `cesur, maceracı ve hızlı karar veren biri`],
    13: ['olgun, sezgili ve besleyici biri', 'şefkatli ve bilge bir figür', 'duygusal olarak güçlü, destek veren biri', `anlayışlı, koruyucu ve sıcak biri`],
    14: ['otoriter, kontrolü elinde tutan biri', 'deneyimli, yol gösteren güçlü bir figür', 'sorumluluk alan, kararlı ve olgun biri', `güvenilir, otorite sahibi ve kararlı biri`],
  };
  const DOMAIN = {
    wands: 'tutku ve eylem', cups: 'duygular ve ilişkiler', swords: 'düşünce ve iletişim',
    pentacles: 'iş ve maddi konular', major: 'kader ve büyük dersler',
  };
  const SUIT_NAME = { wands: 'Asalar', cups: 'Kupalar', swords: 'Kılıçlar', pentacles: 'Tılsımlar' };
  const SUIT_ADVICE = {
    wands: ['cesur ol ve harekete geç', 'beklemeyi bırak ve ilk adımı at', 'tutkunu takip et ve inisiyatif al', `enerjini bir hedefe yönlendir`, `korkularını bir kenara bırakıp cesaretle ilerle`],
    cups: ['kalbini dinle ve duygularını ifade et', 'hislerini saklama, sevdiklerine açıl', 'sezgilerine güven ve kalbine yer aç', `duygularını paylaş ve şefkat göster`, `kalbinin sesini bastırma`],
    swords: ['net düşün ve dürüstçe konuş', 'kafandaki karmaşayı yaz, sonra açıkça konuş', 'gerçeklerle yüzleş ve sınırlarını net çiz', `düşüncelerini netleştir ve açık sözlü ol`, `mantığınla hareket et ve gerçekleri gör`],
    pentacles: ['sabırlı ol ve somut adımlar at', 'küçük ama düzenli adımlarla ilerle', 'pratik ol ve emeğine yatırım yap', `emeğine güven ve istikrarlı ilerle`, `somut hedefler koy ve onlara sadık kal`],
  };
  const ELEMENT_DAY = {
    fire: ['Bugün enerjin yüksek; bir şeye başlamak ya da cesaret isteyen bir adım atmak için iyi bir gün.',
      'İçindeki ateş bugün canlı; ertelediğin bir işe başlamanın tam zamanı.',
      'Bugün cesaret günü: aklındaki o adımı atmaktan çekinme.',
      `Bugün tutkun canlı; sevdiğin bir şeye zaman ayır.`,
      `Bugün harekete geçme günü; enerjini boşa harcama.`,
    ],
    water: ['Bugün duygular ön planda; sevdiklerinle bağ kurmaya ve kendini dinlemeye zaman ayır.',
      'Kalbin bugün daha hassas; sevdiğin biriyle içten bir sohbet iyi gelir.',
      'Bugün sezgilerin güçlü; içinden gelen sese kulak ver.',
      `Bugün duygularına alan aç; kendine şefkat göster.`,
      `Bugün kalbinin sesini dinle; birine sarılmak iyi gelebilir.`,
    ],
    air: ['Bugün zihnin keskin; önemli bir konuşma, karar ya da plan için uygun bir gün.',
      'Bugün düşüncelerin berrak; kafandaki soruları netleştirmek için iyi bir gün.',
      'Kelimelerin bugün güçlü; söylemek istediğin şeyi açıkça ifade et.',
      `Bugün yeni bir şey öğrenmek ya da bir fikri paylaşmak için harika bir gün.`,
      `Bugün iletişim günü; ertelediğin o mesajı gönder.`,
    ],
    earth: ['Bugün ayaklarını yere bas; işlerini, bedenini ve bütçeni gözet.',
      'Bugün pratik işlerin günü; küçük ama somut bir adım büyük fark yaratır.',
      'Bedenine ve düzenine özen göster; bugün sağlam bir zemin kurma günü.',
      `Bugün küçük bir düzen yap; dağınıklığı toplamak zihnini de toplar.`,
      `Bugün bedenine iyi bak; bir yürüyüş ya da güzel bir yemek iyi gelir.`,
    ],
  };

  // Element ilişkileri (elemental dignities)
  const ELEMENT_PAIR = {
    'fire-fire': ['same', ['tutku ve eylem enerjisi katlanarak büyüyor',
      'iki ateş yan yana: istek ve cesaret birbirini alevlendiriyor',
      'hareket enerjisi ikiye katlanıyor; işler hızlı ve coşkulu ilerliyor',
      `ateş üstüne ateş: coşku yüksek, ama tükenmemeye dikkat`,
      `iki ateş bir araya gelince enerji patlıyor; cesur adımlar zamanı`,
    ]],
    'water-water': ['same', ['duygular derinleşiyor, kalp ön planda',
      'duygusal akış güçleniyor; hisler kararları yönlendiriyor',
      'kalbin sesi çok yüksek; sezgi ve duygular birbirini besliyor',
      `su suya karışıyor: duygusal bağlar derinleşiyor`,
      `hisler yoğun; kalbinden geçenler bu dönemi şekillendiriyor`,
    ]],
    'air-air': ['same', ['zihin çok aktif; düşünceler ve konuşmalar belirleyici',
      'akıl ön planda; kelimeler ve fikirler işin yönünü çiziyor',
      'düşünceler hızla dönüyor; açık bir iletişim her şeyi değiştirebilir',
      `iki hava kartı: fikirler bol, ama kararsızlığa dikkat`,
      `zihinsel bir dönem; doğru soruyu sormak her şeyi açabilir`,
    ]],
    'earth-earth': ['same', ['yavaş ama sağlam, somut bir ilerleme var',
      'ayaklar yere basıyor; adım adım, kalıcı bir yapı kuruluyor',
      'gerçekçi ve sabırlı bir enerji; sonuçlar zamanla ama kesin geliyor',
      `toprak toprağa: istikrar ve güven artıyor`,
      `sağlam temeller üzerinde ilerliyorsun; acele etmeye gerek yok`,
    ]],
    'air-fire': ['friend', ['fikirler eyleme dönüşüyor; düşünce ile cesaret birbirini besliyor',
      'hava ateşi büyütür: bir fikir, harekete geçme cesaretini tetikliyor',
      'akıl ile tutku aynı yöne bakıyor; planlar hızla hayata geçebilir',
      `düşünceler kıvılcıma dönüşüyor; konuştuğun şeyleri yapma zamanı`,
      `fikir ile cesaret aynı takımda; ilham hızla eyleme geçiyor`,
    ]],
    'earth-water': ['friend', ['duygular somut bir zemine oturuyor; kalp ile gerçeklik uyumlu',
      'su toprağı besler: hisler gerçek hayatta karşılık buluyor',
      'duygular ile pratik hayat el ele; güven veren, besleyici bir bağ',
      `kalp ile emek birleşiyor; duyguların somut bir şey inşa ediyor`,
      `duygular kök salıyor; güvenli ve kalıcı bir bağ oluşuyor`,
    ]],
    'fire-water': ['enemy', ['tutku ile duygular çekişiyor; istekler ve hisler aynı yöne bakmıyor',
      'ateş ile su karşı karşıya: kalbin bir şey, isteklerin başka bir şey söylüyor olabilir',
      'heyecan ile hassasiyet çatışıyor; aceleci davranmak birini kırabilir',
      `aceleci istekler ile hassas duygular arasında gerilim var`,
      `ateş suyu kaynatır, su ateşi söndürür: bu iki enerjiyi dengelemen gerekiyor`,
    ]],
    'air-earth': ['enemy', ['düşünceler ile gerçekler çatışıyor; plan ile uygulama arasında boşluk var',
      'kafandaki plan ile somut şartlar örtüşmüyor; hayaller gerçekle sınanıyor',
      'konuşmak ile yapmak arasında mesafe var; sözler eyleme dönüşmekte zorlanıyor',
      `zihnin bir şey planlıyor, hayat başka bir şey sunuyor; esnek olmak gerekiyor`,
      `düşünce ile gerçeklik arasında sürtüşme var; planı şartlara uydurmak işe yarar`,
    ]],
    'earth-fire': ['neutral', ['istek ile emek yan yana; sabırla birleşirse kalıcı sonuç verir']],
    'air-water': ['neutral', ['akıl ile kalp yan yana; ikisini birden dinlemek gerekiyor']],
  };

  // Bilinen kart ikilileri (sırasız)
  const PAIRS = [
    ['m16', 'm17', 'Kule ve Yıldız: yıkımın ardından umut ve iyileşme geliyor.'],
    ['m13', 'm0', 'Ölüm ve Deli: bir bölüm kapanıyor ve hemen ardından cesur bir başlangıç geliyor.'],
    ['m18', 'm19', 'Ay ve Güneş: belirsizlik dağılıyor, her şey netleşiyor.'],
    ['m15', 'm6', 'Şeytan ve Aşıklar: tutku ile bağımlılık arasındaki ince çizgiye dikkat.'],
    ['m10', 'm21', 'Kader Çarkı ve Dünya: büyük bir döngü tamamlanıyor, şans senden yana.'],
    ['m2', 'm18', 'Başrahibe ve Ay: sezgilerin çok güçlü; içgüdülerine güven.'],
    ['m1', 'pentacles0', 'Büyücü ve Tılsım Ası: bir fikri somut bir başarıya dönüştürme gücün var.'],
    ['m3', 'cups9', 'İmparatoriçe ve Kupa Onlusu: bolluk, aile ve sevgi dolu bir tablo.'],
    ['m3', 'pentacles9', 'İmparatoriçe ve Tılsım Onlusu: bereket ve kalıcı refah.'],
    ['m4', 'm3', 'İmparator ve İmparatoriçe: yapı ile şefkat bir arada; güçlü bir denge.'],
    ['m11', 'swords6', 'Adalet ve Kılıç Yedilisi: gizli kalan bir şey ortaya çıkabilir.'],
    ['m9', 'swords3', 'Ermiş ve Kılıç Dörtlüsü: geri çekilme ve dinlenme zamanı.'],
    ['m19', 'cups9', 'Güneş ve Kupa Onlusu: saf mutluluk ve huzur.'],
    ['m20', 'm13', 'Mahkeme ve Ölüm: derin bir dönüşüm; eski sen geride kalıyor.'],
    ['m16', 'm13', 'Kule ve Ölüm: büyük ve kaçınılmaz bir değişim yaşanıyor.'],
    ['cups7', 'm0', 'Kupa Sekizlisi ve Deli: bir şeyi geride bırakıp yeni bir maceraya atılmak.'],
    ['swords2', 'cups1', 'Kılıç Üçlüsü ve Kupa İkilisi: kırgınlığın ardından yeniden yakınlaşma.'],
    ['swords2', 'cups0', 'Kılıç Üçlüsü ve Kupa Ası: kırılan kalp yeni bir sevgiyle iyileşiyor.'],
    ['swords8', 'm17', 'Kılıç Dokuzlusu ve Yıldız: kaygılı gecelerin ardından umut.'],
    ['cups4', 'm14', 'Kupa Beşlisi ve Denge: yas yerini huzura ve dengeye bırakıyor.'],
    ['m6', 'cups1', 'Aşıklar ve Kupa İkilisi: güçlü ve karşılıklı bir romantik bağ.'],
    ['m6', 'cups0', 'Aşıklar ve Kupa Ası: yeni ve derin bir aşk enerjisi.'],
    ['m7', 'wands5', 'Savaş Arabası ve Asa Altılısı: kararlılığın zaferle ödülleniyor.'],
    ['m12', 'm0', 'Asılan Adam ve Deli: bekleyiş bitiyor, bir sıçrama zamanı yaklaşıyor.'],
    ['pentacles4', 'm17', 'Tılsım Beşlisi ve Yıldız: zor günlerin ardından yardım ve umut geliyor.'],
  ];

  const POS_LOC = ['Geçmişte', 'Şu anda', 'Gelecekte'];

  /* ---------- Yardımcılar ---------- */
  const elementOf = c => c.arcana === 'major' ? MAJOR_ELEMENT[c.n] : SUIT_ELEMENT[c.suit];
  const baseTone = c => c.arcana === 'major' ? MAJOR_TONE[c.n] : MINOR_TONE[c.suit][c.rank - 1];
  // Ters kart: olumlu enerji tıkanır, zorlayıcı enerji hafifler
  const toneOf = (c, rev) => rev ? (baseTone(c) < 0 ? 0.5 : -0.5) : baseTone(c);
  const cat = x => x > 0.25 ? 'pos' : x < -0.25 ? 'neg' : 'neu';
  const kw = (c, rev, n = 2) => (rev ? c.rev : c.up).split(', ').slice(0, n).join(', ');
  const nm = (c, rev) => `<b>${c.name}</b>${rev ? ' <span class="tag-rev">ters</span>' : ''}`;
  const domainOf = c => c.arcana === 'major' ? 'major' : c.suit;
  const pip = c => c.arcana === 'minor' && c.rank <= 10;
  const pairInfo = (a, b) => ELEMENT_PAIR[[a, b].sort().join('-')];
  const pairKey = (a, b) => [a, b].sort().join('-');
  const lower = s => s.charAt(0).toLocaleLowerCase('tr-TR') + s.slice(1);
  const upper = s => s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);

  /* ---------- Günün Kartı ---------- */
  function daily({ card: c, rev }) {
    const el = elementOf(c), tone = cat(toneOf(c, rev));
    const story = [];
    if (c.arcana === 'major') {
      story.push(v('d:major', [
        `${nm(c, rev)} bugünün kartı. ${c.meaning}`,
        `Bugün seni ${nm(c, rev)} karşılıyor. ${c.meaning}`,
        `Günün kartı ${nm(c, rev)}. ${c.meaning}`,
      `Bugünün rehberi ${nm(c, rev)}. ${c.meaning}`,
      `${nm(c, rev)} bugün seninle. ${c.meaning}`,
    ]));
    } else if (c.court) {
      const person = v('court:' + c.rank, COURT_PERSON[c.rank]);
      story.push(v('d:court', [
        `${nm(c, rev)} bugünün kartı. Bu bir saray kartı: bugün hayatında ${person} öne çıkabilir — ya da bu enerjiyi sen taşıyorsun.`,
        `Bugün ${nm(c, rev)} ile tanışıyorsun: ${person} gününe dokunabilir; belki de o kişi sensin.`,
        `Günün kartı ${nm(c, rev)}. Bugün ${person} önemli olabilir.`,
      `Bugünün kartı ${nm(c, rev)}: hayatında ${person} rol oynayabilir.`,
      `${nm(c, rev)} çıktı; bugün ${person} ile karşılaşabilirsin ya da bu enerji sende.`,
    ]));
    } else {
      const stage = NUMBER_STAGE[c.rank], k = kw(c, rev, 3);
      story.push(v('d:pip', [
        `${nm(c, rev)} bugünün kartı. ${SUIT_NAME[c.suit]} ${DOMAIN[c.suit]} alanını, ${c.rank} sayısı ise <i>${stage}</i> aşamasını anlatır: <i>${k}</i>.`,
        `Bugün ${nm(c, rev)} çıktı: ${DOMAIN[c.suit]} alanında <i>${stage}</i> aşaması. Anahtar kelimeler: <i>${k}</i>.`,
        `Günün kartı ${nm(c, rev)}. ${SUIT_NAME[c.suit]} ${DOMAIN[c.suit]} alanını temsil eder; ${c.rank} sayısı <i>${stage}</i> demek. Bugün öne çıkan: <i>${k}</i>.`,
      `Bugün seni ${nm(c, rev)} karşılıyor: ${DOMAIN[c.suit]} konusunda <i>${stage}</i> dönemindesin. Öne çıkanlar: <i>${k}</i>.`,
      `${nm(c, rev)} bugünün kartı; ${SUIT_NAME[c.suit]} takımında ${c.rank} sayısı <i>${stage}</i> aşamasını gösterir: <i>${k}</i>.`,
    ]));
    }
    if (rev) {
      story.push(baseTone(c) < 0
        ? v('d:rev-eased', [
          'Ters geldiği için bu kartın zorlu yanı bugün hafifliyor; rahatlama ve toparlanma zamanı.',
          'Ters gelmesi iyi haber: bu kartın ağır yanı bugün etkisini yitiriyor.',
          'Kart ters, yani zorluk tersine dönüyor; bugün nefes alabilirsin.',
      `Kart ters geldiği için zorlu enerjisi bugün zayıf; içini rahatlatabilirsin.`,
      `Ters gelen bu kart, bugün yükünün hafifleyeceğini söylüyor.`,
    ])
        : v('d:rev-blocked', [
          'Ters geldiği için bu enerji bugün tıkalı ya da içe dönük olabilir; zorlamak yerine fark etmeye çalış.',
          'Ters gelmesi, bu enerjinin bugün tam akmadığını gösteriyor; kendine biraz zaman tanı.',
          'Kart ters: bugün bu konuda acele etme, önce içine bak.',
      `Ters geldiği için bu kartın enerjisi bugün gecikebilir; sabırlı ol.`,
      `Kart ters: bugün bir şeyler istediğin hızda ilerlemeyebilir, kendini zorlama.`,
    ]));
    }

    const day = [v('d:el:' + el, ELEMENT_DAY[el])];
    if (tone === 'pos') day.push(v('d:pos', [
      'Kartın enerjisi olumlu — günün tadını çıkar.',
      'Güzel bir kart; gün sana gülümsüyor.',
      'Olumlu bir enerji seninle; bunu paylaşmaktan çekinme.',
      `Bugün şans senden yana; fırsatları kaçırma.`,
      `Kart aydınlık bir gün vaat ediyor; keyfini çıkar.`,
    ]));
    else if (tone === 'neg') day.push(v('d:neg', [
      'Zorlayıcı bir kart; günü dikkatle ve kendine şefkat göstererek geçir.',
      'Biraz zorlu bir enerji; bugün kendine nazik davran.',
      'Kart bir uyarı taşıyor; acele kararlardan kaçın ve kendini koru.',
      `Bugün biraz dikkatli ol; acele etmeden, adım adım ilerle.`,
      `Zor bir kart, ama geçici bir enerji; kendine iyi bak.`,
    ]));

    return [
      { title: 'Bugünün mesajı', items: story },
      { title: `${ELEMENT_NAME[el]} enerjisi`, items: day },
    ];
  }

  /* ---------- Geçmiş · Şimdi · Gelecek ---------- */
  function threeCard(cards) {
    const [P, N, F] = cards;
    const tones = cards.map(x => cat(toneOf(x.card, x.rev)));
    const [tp, tn, tf] = tones;
    const a = x => nm(x.card, x.rev), k = x => kw(x.card, x.rev);

    // 1. Hikâye ve ton yayı
    const story = [v('story', [
      `Hikâye ${a(P)} ile başlıyor (<i>${k(P)}</i>), bugün ${a(N)} ile sürüyor (<i>${k(N)}</i>) ve ${a(F)} yönüne ilerliyor (<i>${k(F)}</i>).`,
      `Geçmişten ${a(P)} (<i>${k(P)}</i>), bugünden ${a(N)} (<i>${k(N)}</i>), yarından ise ${a(F)} (<i>${k(F)}</i>) konuşuyor.`,
      `Kartların sırası şöyle: önce ${a(P)} (<i>${k(P)}</i>), ardından ${a(N)} (<i>${k(N)}</i>) ve son olarak ${a(F)} (<i>${k(F)}</i>).`,
      `${a(P)} (<i>${k(P)}</i>) ile açılan hikâye, bugün ${a(N)} (<i>${k(N)}</i>) ile devam ediyor ve ${a(F)} (<i>${k(F)}</i>) ile şekilleniyor.`,
      `Dün ${a(P)} (<i>${k(P)}</i>), bugün ${a(N)} (<i>${k(N)}</i>), yarın ${a(F)} (<i>${k(F)}</i>): kartların anlattığı yol bu.`,
    ])];
    if (tones.every(t => t === 'pos')) story.push(v('arc:allpos', [
      'Üç kart da olumlu: enerji akıyor, kartlar sana yeşil ışık yakıyor.',
      'Kartların hepsi aydınlık: işler senin lehine akıyor.',
      'Baştan sona olumlu bir tablo; bu dönemin tadını çıkar.',
      `Üç kart da güzel haberler taşıyor; önündeki yol açık.`,
      `Kartlar hep bir ağızdan olumlu konuşuyor; kendine güven.`,
    ]));
    else if (tones.every(t => t === 'neg')) story.push(v('arc:allneg', [
      'Zorlu bir tablo — ama tarot kaderi değil yönü gösterir. Kartlar nelere dikkat etmen gerektiğini anlatıyor.',
      'Kartlar zorlu görünüyor, ama bu bir hüküm değil bir uyarı: neyin değişmesi gerektiğini gösteriyorlar.',
      'Ağır bir açılım; yine de her zorluk bir farkındalık fırsatı. Kartlar sana nereye bakman gerektiğini söylüyor.',
      `Kartlar zor bir dönemi anlatıyor; ama zorluğu görmek, onu aşmanın yarısıdır.`,
      `Bu açılım kolay değil, ama bir yol haritası sunuyor: hangi konularda kendini korumalısın, kartlar onu gösteriyor.`,
    ]));
    else if (tp === 'neg' && tf === 'pos') story.push(v('arc:rise', [
      'Zorlu bir geçmişten aydınlık bir geleceğe: bu bir iyileşme ve yükseliş hikâyesi.',
      'Karanlıktan aydınlığa uzanan bir yol: zor günler geride kalıyor.',
      'Hikâye zorlukla başlıyor ama umutla bitiyor; toparlanma yolda.',
      `Zor bir başlangıç, aydınlık bir son: kartlar toparlanmanın geldiğini söylüyor.`,
      `Geçmişin yükü hafifliyor, gelecek daha parlak görünüyor; bu bir yükseliş hikâyesi.`,
    ]));
    else if (tp === 'pos' && tf === 'neg') story.push(v('arc:fall', [
      'Geçmişteki iyi enerji geleceğe taşınmıyor gibi görünüyor. Bu bir uyarı: neyin değiştiğine dikkat et.',
      'İyi başlayan bir süreç zorlaşabilir; değişen şeyi erken fark etmek önemli.',
      'Geçmişin olumlu havası sönükleşiyor gibi; dikkatli olursan bu gidişatı değiştirebilirsin.',
      `Güzel başlayan bir şeyin gidişatı değişebilir; erken davranırsan rotayı düzeltebilirsin.`,
      `Geçmişteki aydınlık gelecekte biraz gölgeleniyor; kartlar seni uyanık olmaya çağırıyor.`,
    ]));
    else if (tn === 'neg' && tf === 'pos') story.push(v('arc:tempneg', [
      'Şu anki zorluk geçici; kartlar düzelmeyi gösteriyor.',
      'Bugün zor olabilir ama kalıcı değil; gelecek kartı daha iyi günleri işaret ediyor.',
      'Şu an yaşadığın sıkıntı bir geçiş dönemi; ardından rahatlama geliyor.',
      `Şu an zorlansan da kartlar bunun kısa süreceğini söylüyor; sabret.`,
      `Bugünkü sıkıntı yolun sonu değil; gelecek kartı daha hafif günler vaat ediyor.`,
    ]));
    else if (tn === 'pos' && tf === 'neg') story.push(v('arc:nowpos', [
      'Şu an işler yolunda, ama gelecek kartı dikkatli olmayı öğütlüyor.',
      'Bugün her şey iyi görünüyor; yine de önündeki döneme hazırlıklı olmakta fayda var.',
      'Şimdinin rahatlığı içinde gevşeme; gelecek kartı küçük bir uyarı taşıyor.',
      `Bugün keyfin yerinde, ama gelecek kartı tetikte olmanı istiyor.`,
      `Şu anki iyi enerjiyi korumak için biraz özen gerekecek; gelecek kartı buna işaret ediyor.`,
    ]));
    else if (tf === 'pos') story.push(v('arc:futpos', [
      'Hikâye olumlu bir yöne ilerliyor.',
      'Gidişat güzel: kartlar iyi bir sonuca işaret ediyor.',
      'Yol aydınlığa çıkıyor; gelecek kartı umut veriyor.',
      `Sonuç kartı olumlu: bu hikâye güzel bir yere varıyor.`,
      `Kartlar iyi bir sona doğru ilerliyor; umutlu olmak için sebebin var.`,
    ]));
    else if (tf === 'neg') story.push(v('arc:futneg', [
      'Gelecek kartı zorlayıcı: bunu kesin bir kader değil, şimdiden önlem alabileceğin bir ihtimal olarak gör.',
      'Gelecek biraz zorlu görünüyor; ama bu bir kehanet değil, hazırlanman için bir işaret.',
      'Önündeki dönem kolay olmayabilir; şimdiden fark etmen, onu yumuşatmanın ilk adımı.',
      `Gelecek kartı bir uyarı taşıyor; bunu bilmek, ona göre hazırlanmanı sağlar.`,
      `Önündeki kart zorlayıcı, ama değişmez değil; bugünkü adımların onu yumuşatabilir.`,
    ]));
    else story.push(v('arc:balanced', [
      'Dengeli bir tablo: ne büyük bir iniş ne de büyük bir çıkış var; sonucu senin adımların belirleyecek.',
      'Kartlar ne çok iyi ne çok kötü; terazinin hangi yöne döneceği senin seçimlerine bağlı.',
      'Sakin, dengeli bir açılım; büyük sürprizler yok, belirleyici olan senin tavrın.',
      `Kartlar dengede duruyor; hikâyenin sonunu sen yazacaksın.`,
      `Ne fırtına ne bayram: sakin bir dönem. Ne yöne gideceğini senin kararların belirleyecek.`,
    ]));

    // 2. Kartlar arası bağ: elementler
    const bond = [];
    const els = cards.map(x => elementOf(x.card));
    const pn = pairInfo(els[0], els[1]), nf = pairInfo(els[1], els[2]);
    const elLabel = (x, y) => x === y ? ELEMENT_NAME[x] : `${ELEMENT_NAME[x]}–${ELEMENT_NAME[y]}`;
    const pairText = (x, y) => v('el:' + pairKey(x, y), pairInfo(x, y)[1]);
    if (pn === nf && pn[0] !== 'neutral') {
      bond.push(`${v('el:prefix-same', ['Geçmişten geleceğe aynı ilişki sürüyor', 'Üç kart boyunca aynı element ilişkisi devam ediyor', 'Baştan sona aynı enerji hâkim', `Bütün açılım boyunca aynı element bağı var`, `Kartlar baştan sona aynı enerjide buluşuyor`])} (${elLabel(els[0], els[1])}): ${pairText(els[0], els[1])}.`);
    } else {
      if (pn[0] !== 'neutral') bond.push(`${v('el:prefix-pn', ['Geçmiş ile şimdi arasında', 'Geçmişten bugüne geçerken', 'Geçmiş ve şimdi kartları arasında', `Dünden bugüne`, `Geçmiş kartı ile bugünün kartı arasında`])} (${elLabel(els[0], els[1])}): ${pairText(els[0], els[1])}.`);
      if (nf[0] !== 'neutral') bond.push(`${v('el:prefix-nf', ['Şimdi ile gelecek arasında', 'Bugünden geleceğe uzanırken', 'Şimdi ve gelecek kartları arasında', `Bugünden yarına`, `Bugünün kartı ile gelecek kartı arasında`])} (${elLabel(els[1], els[2])}): ${pairText(els[1], els[2])}.`);
    }
    const helped = x => x[0] === 'same' || x[0] === 'friend';
    const n = N.card.name;
    if (helped(pn) && helped(nf)) bond.push(v('el:mid-helped', [
      `Şimdi kartı iki yandan da destekleniyor; ${n} enerjisi şu an güçlü biçimde yaşanıyor.`,
      `Ortadaki ${n} iki komşusundan da güç alıyor; etkisi şu an çok belirgin.`,
      `${n} iki yandan beslendiği için bugünün en baskın enerjisi o.`,
      `${n} iki yanındaki kartlardan destek alıyor; bu enerji şu an hayatında çok güçlü.`,
      `İki komşusu da ${n} kartını besliyor; bugünün ana teması bu kart.`,
    ]));
    else if (pn[0] === 'enemy' && nf[0] === 'enemy') bond.push(v('el:mid-blocked', [
      `Şimdi kartı iki yandan da zorlanıyor; ${n} enerjisi şu an zayıf ya da beklenenden farklı yaşanabilir.`,
      `Ortadaki ${n} iki komşusuyla da çatışıyor; anlamı şu an tam olarak hissedilmeyebilir.`,
      `${n} iki yandan sıkıştırılmış durumda; enerjisi kendini göstermekte zorlanıyor.`,
      `${n} iki yanındaki kartlarla çekişiyor; etkisi şu an zayıflamış olabilir.`,
      `İki komşusu ${n} kartının önünü kesiyor; bu enerjiyi yaşamak şu an zor olabilir.`,
    ]));
    if (!bond.length) bond.push(v('el:neutral', [
      'Kartların elementleri birbirine karşı nötr: her biri kendi alanında, ayrı ayrı etkili.',
      'Kartlar arasında belirgin bir element çekişmesi ya da desteği yok; her biri kendi mesajını taşıyor.',
      'Elementler birbirine tarafsız; kartları ayrı ayrı okumak burada daha anlamlı.',
      `Elementler arasında ne destek ne çatışma var; her kart kendi hikâyesini anlatıyor.`,
      `Kartların enerjileri birbirine karışmıyor; her birini ayrı bir mesaj olarak düşün.`,
    ]));

    // Takım geçişi
    const doms = cards.map(x => domainOf(x.card));
    const [d0, d1, d2] = doms.map(d => DOMAIN[d]);
    if (doms[0] === doms[1] && doms[1] === doms[2]) {
      if (doms[0] === 'major') bond.push(v('suit:allmajor', [
        'Üç kart da Büyük Arkana: hayatında kader niteliğinde, büyük bir dönem yaşanıyor.',
        'Üç Büyük Arkana kartı bir arada: bu, gündelik bir mesele değil, hayatının akışını değiştiren bir dönem.',
        'Sadece Büyük Arkana kartları çıktı: hayat sana büyük bir ders veriyor.',
      `Üç kartın üçü de Büyük Arkana: bu dönemin izleri uzun süre hissedilecek.`,
    ]));
      else {
        const S = SUIT_NAME[doms[0]];
        bond.push(v('suit:all', [
          `Üç kart da ${S}: mesele tamamen ${d0} alanında.`,
          `Bütün kartlar ${S} takımından: her şey ${d0} etrafında dönüyor.`,
          `Tek takım, tek konu: ${S}. Odak tamamen ${d0} alanında.`,
      `Kartların hepsi ${S}: bu açılımın tek konusu ${d0}.`,
      `${S} takımı açılımı tamamen sarmış; mesele ${d0} etrafında şekilleniyor.`,
    ]));
      }
    } else if (doms[0] === doms[2]) {
      bond.push(v('suit:ends', [
        `Konu ${d0} alanında başlıyor ve yine orada çözülüyor; arada ${d1} alanından bir etki var.`,
        `Hikâye ${d0} alanında açılıp yine orada kapanıyor; ortada ${d1} alanından bir dokunuş var.`,
        `Başlangıç ve sonuç aynı alanda: ${d0}. Aradaki ${d1} etkisi bir köprü görevi görüyor.`,
      `Konu ${d0} alanında başlayıp yine orada bitiyor; ortadaki ${d1} etkisi geçici bir uğrak.`,
      `${upper(d0)} hem başta hem sonda; araya giren ${d1} etkisi hikâyeye renk katıyor.`,
    ]));
    } else {
      bond.push(v('suit:shift', [
        `Odak, ${d0} alanından ${d2} alanına kayıyor.`,
        `Hikâye ${d0} alanından ${d2} alanına doğru ilerliyor.`,
        `Ağırlık merkezi değişiyor: ${d0} geride kalırken ${d2} öne çıkıyor.`,
      `Mesele ${d0} alanında başlıyor, ${d2} alanında sonuçlanıyor.`,
      `${upper(d0)} geride kalıyor; önümüzdeki dönemde ${d2} daha belirleyici olacak.`,
    ]));
    }

    // 3. Dikkat çekenler
    const notes = [];
    const majors = cards.map((x, i) => x.card.arcana === 'major' ? i : -1).filter(i => i >= 0);
    if (majors.length === 0) notes.push(v('maj:none', [
      'Hiç Büyük Arkana yok: bu durum tamamen senin elinde; gündelik seçimlerin sonucu belirleyecek.',
      'Büyük Arkana kartı çıkmadı: kader değil, senin günlük kararların belirleyici.',
      'Açılımda Büyük Arkana yok; yani bu konu kontrolünün dışında değil, dümen sende.',
      `Büyük Arkana yok; bu, kader güçlerinden çok senin gündelik adımlarının önemli olduğu anlamına geliyor.`,
      `Kartların hiçbiri Büyük Arkana değil; yani sonucu şekillendirmek tamamen senin elinde.`,
    ]));
    else if (majors.length === 1) notes.push([
      () => v('maj:past', [
        'Geçmişteki Büyük Arkana kartı, bugünü hâlâ şekillendiren büyük bir olayı işaret ediyor.',
        'Geçmişte yaşanan önemli bir dönüm noktası bugünü hâlâ etkiliyor.',
        'Geçmiş kartının Büyük Arkana olması, arkanda bıraktığın büyük bir olayın izlerinin sürdüğünü gösteriyor.',
      `Geçmiş bir Büyük Arkana kartıyla temsil ediliyor; o dönemde yaşanan önemli bir şey bugünün temelini oluşturuyor.`,
      `Arkanda büyük bir olay var; o dönemin etkisi bugüne kadar uzanıyor.`,
    ]),
      () => v('maj:now', [
        'Şimdi kartı Büyük Arkana: şu an önemli bir eşiktesin, bu dönem sıradan değil.',
        'Bugün bir Büyük Arkana kartıyla temsil ediliyor: hayatında kritik bir an yaşıyorsun.',
        'Şu anki dönem sıradan değil; Büyük Arkana kartı önemli bir eşikte olduğunu söylüyor.',
      `Şu an bir Büyük Arkana dönemindesin; yaşadıkların sıradan değil, önemli bir dönüşümün parçası.`,
      `Bugünün kartı bir Büyük Arkana; hayatında belirleyici bir dönemden geçiyorsun.`,
    ]),
      () => v('maj:fut', [
        'Gelecek kartı Büyük Arkana: önündeki gelişme küçük bir olay değil, hayatına iz bırakacak bir dönüm noktası.',
        'Gelecekte bir Büyük Arkana var: yaklaşan şey hayatında iz bırakacak.',
        'Önünde büyük bir gelişme var; Büyük Arkana kartı bunun sıradan bir olay olmayacağını gösteriyor.',
      `Gelecek kartının Büyük Arkana olması, yaklaşan değişimin büyük ve kalıcı olacağını gösteriyor.`,
      `Önündeki dönem bir Büyük Arkana kartıyla temsil ediliyor; önemli bir dönüm noktası yaklaşıyor.`,
    ]),
    ][majors[0]]());
    else if (majors.length === 2) {
      const [m1, m2] = majors.map(i => cards[i].card);
      notes.push(m2.n > m1.n
        ? v('maj:up', [
          `İki Büyük Arkana kartı ileriye doğru ilerliyor (${m1.top} → ${m2.top}): ruhsal bir olgunlaşma yaşıyorsun.`,
          `Büyük Arkana kartları ileri bir aşamaya geçiyor (${m1.top} → ${m2.top}): içsel olarak büyüyorsun.`,
          `Büyük Arkana yolculuğunda ilerliyorsun (${m1.top} → ${m2.top}): bu bir gelişim ve olgunlaşma işareti.`,
      `Büyük Arkana kartları ileriye gidiyor (${m1.top} → ${m2.top}): bir dersi tamamlayıp bir sonrakine geçiyorsun.`,
    ])
        : v('maj:down', [
          'İki Büyük Arkana kartı var: büyük güçler devrede ve bir ders tekrar önüne geliyor olabilir.',
          'İki Büyük Arkana kartı geri yönde: daha önce öğrendiğini sandığın bir ders yeniden karşına çıkabilir.',
          'Büyük Arkana kartları geriye dönüyor; eski bir konuya yeniden bakman gerekebilir.',
      `Büyük Arkana kartları geriye doğru: geçmişte yarım kalan bir dersi tamamlama fırsatı gelebilir.`,
    ]));
    }

    // Sayılar
    if (cards.every(x => pip(x.card))) {
      const r = cards.map(x => x.card.rank), seq = r.join(' → ');
      if (r[0] < r[1] && r[1] < r[2]) notes.push(v('num:asc', [
        `Sayılar artıyor (${seq}): süreç olgunlaşıyor, olaylar doğal akışında ilerliyor.`,
        `Sayılar yükseliyor (${seq}): bir süreç adım adım büyüyor.`,
        `Artan sayılar (${seq}) işlerin doğal bir ilerleyişle olgunlaştığını gösteriyor.`,
      `Sayılar büyüyor (${seq}): her adım bir öncekinin üzerine inşa ediliyor.`,
    ]));
      else if (r[0] > r[1] && r[1] > r[2]) notes.push(v('num:desc', [
        `Sayılar azalıyor (${seq}): bir şey başa dönüyor; eski bir konu yeniden açılabilir ya da yeni bir döngü başlıyor.`,
        `Azalan sayılar (${seq}) bir geri dönüşü anlatıyor: başa dönüp yeniden başlamak gündemde.`,
        `Sayılar geriye sayıyor (${seq}): bir döngü sıfırlanıyor, yeni bir başlangıç hazırlanıyor.`,
      `Sayılar küçülüyor (${seq}): bir şeyi bırakıp temele dönmek gerekebilir.`,
    ]));
    }
    const ranks = cards.filter(x => pip(x.card)).map(x => x.card.rank);
    const dup = ranks.find((r, i) => ranks.indexOf(r) !== i);
    if (dup) notes.push(v('num:dup', [
      `${dup} sayısı tekrar ediyor: <i>${NUMBER_STAGE[dup]}</i> teması bu açılımın ana konusu.`,
      `İki kartta ${dup} sayısı var; <i>${NUMBER_STAGE[dup]}</i> teması öne çıkıyor.`,
      `Tekrar eden ${dup} sayısı, <i>${NUMBER_STAGE[dup]}</i> temasının altını çiziyor.`,
      `${dup} sayısı iki kez çıktı; <i>${NUMBER_STAGE[dup]}</i> bu açılımın kilit teması.`,
    ]));
    if (pip(F.card) && F.card.rank === 1) notes.push(v('num:futace', [
      'Gelecekte bir As var: yepyeni bir sayfa açılıyor.',
      'Gelecek kartı bir As: taze bir başlangıç kapıda.',
      'As kartı gelecekte: yeni bir fırsatın tohumu atılıyor.',
      `Gelecekte As çıktı: yeni bir şey filizleniyor.`,
    ]));
    if (pip(N.card) && N.card.rank === 10) notes.push(v('num:nowten', [
      'Şimdi kartı bir On: bir döngü kapanmak üzere.',
      'Bugün bir On ile temsil ediliyor: bir dönem tamamlanıyor.',
      'Şimdi kartının On olması, bir sürecin sonuna geldiğini gösteriyor.',
      `Şimdi kartında On var: bir hikâye son sayfasına geliyor.`,
    ]));
    if (pip(F.card) && F.card.rank === 10) notes.push(v('num:futten', [
      'Gelecekte bir On var: bu süreç tamamlanıp sonuçlanacak.',
      'Gelecek kartı bir On: hikâye bir sonuca bağlanıyor.',
      'On kartı gelecekte: başladığın şey tamamlanacak.',
      `Gelecekte bir On: emeklerinin karşılığını göreceğin bir son yaklaşıyor.`,
    ]));

    // Ters kartlar — zorlayıcı bir kartın tersi rahatlama, olumlu bir kartın tersi tıkanıklık demektir
    if (cards.every(x => x.rev)) notes.push(v('rev:all', [
      'Üç kart da ters: bu dönem içe dönme, bekleme ve iç engelleri çözme zamanı.',
      'Bütün kartlar ters geldi: dışarıda değil, içeride bir şeyler çözülmeyi bekliyor.',
      'Üç ters kart: acele etme; önce kendi içindeki düğümleri çöz.',
      `Kartların hepsi ters: dışarıdaki olaylardan çok iç dünyana odaklanma zamanı.`,
    ]));
    else {
      const eased = x => baseTone(x.card) < 0;
      if (P.rev) notes.push(eased(P)
        ? v('rev:past-eased', [
          'Geçmiş kartı ters: geçmişteki zor dönemin etkisi azalmış; o yükü büyük ölçüde geride bırakmışsın.',
          'Ters gelen geçmiş kartı, eski bir yaranın iyileşmekte olduğunu gösteriyor.',
          'Geçmişteki zorluk tersine dönmüş: o dönemin ağırlığı artık hafiflemiş.',
      `Geçmiş kartı ters geldiği için o zor dönemin gücü azalmış; artık seni eskisi kadar etkilemiyor.`,
      `Geçmişteki sıkıntı ters dönmüş; o yaradan büyük ölçüde iyileşmişsin.`,
    ])
        : v('rev:past-blocked', [
          'Geçmiş kartı ters: geçmişte kapanmamış, hâlâ çözülmeyi bekleyen bir konu var.',
          'Ters gelen geçmiş kartı, yarım kalmış bir meseleye işaret ediyor.',
          'Geçmişten gelen ve tam kapanmamış bir konu bugünü etkiliyor olabilir.',
      `Ters geçmiş kartı, tam yaşanamamış ya da kapanmamış bir şeye işaret ediyor.`,
      `Geçmişte yarım kalan bir konu var; onu kapatmak bugünü hafifletebilir.`,
    ]));
      if (N.rev) notes.push(eased(N)
        ? v('rev:now-eased', [
          'Şimdi kartı ters: zorlu enerji hafifliyor; en kötüsü geride kalıyor olabilir.',
          'Ters gelen şimdi kartı, sıkıntının yavaş yavaş çözüldüğünü gösteriyor.',
          'Bugünün zorluğu tersine dönmüş: rahatlama başlıyor.',
      `Şimdi kartı ters: içinde bulunduğun zorluk gücünü kaybediyor.`,
      `Bugünün sıkıntısı tersine dönmüş; toparlanma başladı bile.`,
    ])
        : v('rev:now-blocked', [
          'Şimdi kartı ters: enerji şu an tıkalı ya da içe dönük; dışarıdan görünmeyen bir iç süreç yaşanıyor.',
          'Ters gelen şimdi kartı, şu an bir şeylerin akmadığını ya da içinde sakladığın bir duyguyu gösteriyor.',
          'Şu an enerji içe dönük; dışarıdan sakin görünse de içinde bir süreç işliyor.',
      `Ters şimdi kartı, bu enerjinin şu an tam yaşanamadığını gösteriyor; bir şey onu bekletiyor.`,
      `Şu an içinde bir düğüm var; bu kartın enerjisi dışarı çıkmakta zorlanıyor.`,
    ]));
      if (F.rev) notes.push(eased(F)
        ? v('rev:fut-eased', [
          'Gelecek kartı ters: beklenen zorluk düşündüğünden hafif geçebilir.',
          'Ters gelen gelecek kartı, korktuğun şeyin o kadar da ağır olmayacağını söylüyor.',
          'Gelecekteki zorluk tersine dönmüş: endişelendiğin kadar kötü olmayabilir.',
      `Gelecek kartı ters: önündeki zorluk beklediğinden çok daha yumuşak geçebilir.`,
      `Gelecekteki zor kart ters dönmüş; endişelenmene gerek olmayabilir.`,
    ])
        : v('rev:fut-blocked', [
          'Gelecek kartı ters: gelecek henüz kesinleşmemiş. Bugünkü seçimlerin bu sonucu değiştirebilir.',
          'Ters gelen gelecek kartı, sonucun henüz netleşmediğini gösteriyor; seçimlerin belirleyici olacak.',
          'Gelecek biraz bulanık: bu kartın enerjisi gecikebilir ya da farklı bir biçimde gelebilir.',
      `Ters gelecek kartı, bu sonucun gecikebileceğini ya da başka bir şekilde gelebileceğini söylüyor.`,
      `Gelecek henüz şekilleniyor; ters kart, bugünkü adımlarının sonucu değiştirebileceğini hatırlatıyor.`,
    ]));
    }

    // Saray kartları
    const courts = cards.map((x, i) => [x, i]).filter(([x]) => x.card.court);
    courts.forEach(([x, i]) => notes.push(`${POS_LOC[i]} ${a(x)}: ${v('court:' + x.card.rank, COURT_PERSON[x.card.rank])}.`));
    if (courts.length >= 2) notes.push(v('court:many', [
      'Birden fazla saray kartı: bu hikâyede başka insanlar belirleyici bir rol oynuyor.',
      'Açılımda birkaç saray kartı var; çevrendeki insanlar bu konuda önemli.',
      'Saray kartlarının çokluğu, bu meselenin sadece seninle ilgili olmadığını gösteriyor.',
      `Birden çok saray kartı çıktı: bu hikâyede yalnız değilsin, başka insanların da payı var.`,
    ]));

    // Bilinen ikililer
    const ids = cards.map(x => x.card.id);
    PAIRS.forEach(([p, q, text]) => {
      if (ids.includes(p) && ids.includes(q)) {
        const anyRev = cards.some(x => (x.card.id === p || x.card.id === q) && x.rev);
        notes.push(text + (anyRev ? v('pair:rev', [
          ' Ters kart yüzünden bu süreç daha yavaş işleyebilir.',
          ' Ters kart, bunun gecikmeli yaşanabileceğini söylüyor.',
          ' Ters gelen kart nedeniyle bu enerji biraz zaman alabilir.',
      ` Ters kart, bu enerjinin tam olarak açılması için biraz sabır gerektiğini söylüyor.`,
    ]) : ''));
      }
    });

    // 4. Tavsiye
    const advice = [];
    if (F.card.arcana === 'major') {
      const m = F.card.meaning;
      advice.push(F.rev
        ? v('adv:major-rev', [
          `${a(F)}: kartın özü şu — ${lower(m)} Ters geldiği için bu mesajın önünde bir engel var: <i>${k(F)}</i>.`,
          `${a(F)} geldi. Özünde şunu söyler: ${lower(m)} Ama şu an önünde <i>${k(F)}</i> gibi bir engel var.`,
          `Gelecek kartın ${a(F)}. Mesajı aslında şu: ${lower(m)} Yalnız ters geldiği için önce <i>${k(F)}</i> ile yüzleşmen gerekebilir.`,
      `${a(F)} ters geldi: ${lower(m)} Ancak önce <i>${k(F)}</i> konusunu çözmen gerekiyor.`,
    ])
        : v('adv:major', [
          `${a(F)}: ${m}`,
          `${a(F)} sana şunu söylüyor: ${lower(m)}`,
          `Gelecek kartın ${a(F)}. Mesajı: ${lower(m)}`,
      `${a(F)} geleceğini işaret ediyor: ${lower(m)}`,
    ]));
    } else {
      const adv = v('advice:' + F.card.suit, SUIT_ADVICE[F.card.suit]);
      advice.push(tf === 'neg'
        ? v('adv:neg', [
          `Önündeki dönemde ${adv}. ${a(F)} şu konularda seni uyarıyor: <i>${k(F)}</i>. Bunları önceden fark etmek, yaşanmalarını engelleyebilir.`,
          `${upper(adv)}. ${a(F)}, <i>${k(F)}</i> konusunda dikkatli olmanı söylüyor.`,
          `Gelecek için önerim: ${adv}. ${a(F)} ise seni <i>${k(F)}</i> konusunda uyarıyor.`,
      `Önerim: ${adv}. ${a(F)}, <i>${k(F)}</i> konusunda seni şimdiden uyarıyor.`,
      `${upper(adv)}. Gelecekte ${a(F)} var; <i>${k(F)}</i> riskine karşı tetikte ol.`,
    ])
        : v('adv:pos', [
          `Önündeki dönemde ${adv}. ${a(F)} sana <i>${k(F)}</i> enerjisini getiriyor.`,
          `${upper(adv)}; ${a(F)} yolunu <i>${k(F)}</i> ile aydınlatıyor.`,
          `Gelecek için önerim: ${adv}. ${a(F)} sana <i>${k(F)}</i> vaat ediyor.`,
      `Önerim: ${adv}. ${a(F)} sana <i>${k(F)}</i> getiriyor.`,
      `${upper(adv)}. Gelecekte seni ${a(F)} ve onun getirdiği <i>${k(F)}</i> bekliyor.`,
    ]));
    }
    if (F.rev && baseTone(F.card) >= 0) advice.push(v('adv:blocked', [
      'Ama önce önündeki tıkanıklığı fark et ve çözmeye çalış.',
      'Yalnız önce yolundaki engeli tanı; o çözülünce akış başlar.',
      'Ters kart, önce içindeki direnci gevşetmen gerektiğini söylüyor.',
      `Önce yolundaki tıkanıklığı aç; sonrası daha kolay gelecek.`,
    ]));
    if (N.card.arcana === 'minor' && N.card.suit !== F.card.suit) {
      const adv = v('advice:' + N.card.suit, SUIT_ADVICE[N.card.suit]);
      advice.push(v('adv:today', [`Bugün için: ${adv}.`, `Bugünün önerisi: ${adv}.`, `Şimdilik yapabileceğin en iyi şey: ${adv}.`, `Bugün kendine şunu hatırlat: ${adv}.`, `Bugün için küçük bir öneri: ${adv}.`]));
    }

    const out = [
      { title: 'Hikâye', items: story },
      { title: 'Kartlar arası bağ', items: bond },
    ];
    if (notes.length) out.push({ title: 'Dikkat çekenler', items: notes });
    out.push({ title: 'Tavsiye', items: advice });
    return out;
  }

  // options.seed: hafızayı kullanmadan, verilen sayıya göre sabit yazılış seçer
  window.interpretReading = function (cards, options = {}) {
    if (cards.length !== 1 && cards.length !== 3) return null; // eski 5 ve 10 kartlık açılımlar
    fixedSeed = options.seed ?? null;
    try {
      const out = cards.length === 1 ? daily(cards[0]) : threeCard(cards);
      if (fixedSeed === null) saveMem();
      return out;
    } finally {
      fixedSeed = null;
    }
  };
})();
