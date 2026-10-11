// Kural tabanlı yorum motoru.
// Kartları tek tek değil, birbirleriyle ilişkileri üzerinden okur:
// ton yayı, element uyumu, sayı ilerleyişi, takım geçişleri, Büyük Arkana,
// ters kartlar, saray kartları ve bilinen kart ikilileri.
(function () {
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
    11: 'meraklı, öğrenmeye açık genç bir enerji ya da yeni bir haber',
    12: 'hızlı hareket eden, atılgan biri',
    13: 'olgun, sezgili ve besleyici biri',
    14: 'otoriter, kontrolü elinde tutan biri',
  };
  const DOMAIN = {
    wands: 'tutku ve eylem', cups: 'duygular ve ilişkiler', swords: 'düşünce ve iletişim',
    pentacles: 'iş ve maddi konular', major: 'kader ve büyük dersler',
  };
  const SUIT_NAME = { wands: 'Asalar', cups: 'Kupalar', swords: 'Kılıçlar', pentacles: 'Tılsımlar' };
  const SUIT_ADVICE = {
    wands: 'cesur ol ve harekete geç',
    cups: 'kalbini dinle ve duygularını ifade et',
    swords: 'net düşün ve dürüstçe konuş',
    pentacles: 'sabırlı ol ve somut adımlar at',
  };
  const ELEMENT_DAY = {
    fire: 'Bugün enerjin yüksek; bir şeye başlamak ya da cesaret isteyen bir adım atmak için iyi bir gün.',
    water: 'Bugün duygular ön planda; sevdiklerinle bağ kurmaya ve kendini dinlemeye zaman ayır.',
    air: 'Bugün zihnin keskin; önemli bir konuşma, karar ya da plan için uygun bir gün.',
    earth: 'Bugün ayaklarını yere bas; işlerini, bedenini ve bütçeni gözet.',
  };

  // Element ilişkileri (elemental dignities)
  const ELEMENT_PAIR = {
    'fire-fire': ['same', 'tutku ve eylem enerjisi katlanarak büyüyor'],
    'water-water': ['same', 'duygular derinleşiyor, kalp ön planda'],
    'air-air': ['same', 'zihin çok aktif; düşünceler ve konuşmalar belirleyici'],
    'earth-earth': ['same', 'yavaş ama sağlam, somut bir ilerleme var'],
    'air-fire': ['friend', 'fikirler eyleme dönüşüyor; düşünce ile cesaret birbirini besliyor'],
    'earth-water': ['friend', 'duygular somut bir zemine oturuyor; kalp ile gerçeklik uyumlu'],
    'fire-water': ['enemy', 'tutku ile duygular çekişiyor; istekler ve hisler aynı yöne bakmıyor'],
    'air-earth': ['enemy', 'düşünceler ile gerçekler çatışıyor; plan ile uygulama arasında boşluk var'],
    'earth-fire': ['neutral', 'istek ile emek yan yana; sabırla birleşirse kalıcı sonuç verir'],
    'air-water': ['neutral', 'akıl ile kalp yan yana; ikisini birden dinlemek gerekiyor'],
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
  const POS_NAME = ['Geçmiş', 'Şimdi', 'Gelecek'];

  /* ---------- Yardımcılar ---------- */
  const elementOf = c => c.arcana === 'major' ? MAJOR_ELEMENT[c.n] : SUIT_ELEMENT[c.suit];
  const baseTone = c => c.arcana === 'major' ? MAJOR_TONE[c.n] : MINOR_TONE[c.suit][c.rank - 1];
  // Ters kart: olumlu enerji tıkanır, zorlayıcı enerji hafifler
  const toneOf = (c, rev) => rev ? (baseTone(c) < 0 ? 0.5 : -0.5) : baseTone(c);
  const cat = v => v > 0.25 ? 'pos' : v < -0.25 ? 'neg' : 'neu';
  const kw = (c, rev, n = 2) => (rev ? c.rev : c.up).split(', ').slice(0, n).join(', ');
  const nm = (c, rev) => `<b>${c.name}</b>${rev ? ' <span class="tag-rev">ters</span>' : ''}`;
  const domainOf = c => c.arcana === 'major' ? 'major' : c.suit;
  const pip = c => c.arcana === 'minor' && c.rank <= 10;
  function pairInfo(a, b) { return ELEMENT_PAIR[[a, b].sort().join('-')]; }
  function pick(seed, arr) { return arr[seed % arr.length]; }
  function seedOf(cards) { let h = 7; cards.forEach(({ card, rev }) => { for (const ch of card.id + rev) h = (h * 31 + ch.charCodeAt(0)) >>> 0; }); return h; }

  /* ---------- Günün Kartı ---------- */
  function daily({ card: c, rev }) {
    const el = elementOf(c), tone = cat(toneOf(c, rev));
    const story = [];
    if (c.arcana === 'major') story.push(`${nm(c, rev)} bugünün kartı. ${c.meaning}`);
    else if (c.court) story.push(`${nm(c, rev)} bugünün kartı. Bu bir saray kartı: bugün hayatında ${COURT_PERSON[c.rank]} öne çıkabilir — ya da bu enerjiyi sen taşıyorsun.`);
    else story.push(`${nm(c, rev)} bugünün kartı. ${SUIT_NAME[c.suit]} ${DOMAIN[c.suit]} alanını, ${c.rank} sayısı ise <i>${NUMBER_STAGE[c.rank]}</i> aşamasını anlatır: <i>${kw(c, rev, 3)}</i>.`);
    if (rev) story.push(baseTone(c) < 0
      ? 'Ters geldiği için bu kartın zorlu yanı bugün hafifliyor; rahatlama ve toparlanma zamanı.'
      : 'Ters geldiği için bu enerji bugün tıkalı ya da içe dönük olabilir; zorlamak yerine fark etmeye çalış.');

    const day = [ELEMENT_DAY[el]];
    if (tone === 'pos') day.push('Kartın enerjisi olumlu — günün tadını çıkar.');
    else if (tone === 'neg') day.push('Zorlayıcı bir kart; günü dikkatle ve kendine şefkat göstererek geçir.');

    return [
      { title: 'Bugünün mesajı', items: story },
      { title: `${ELEMENT_NAME[el]} enerjisi`, items: day },
    ];
  }

  /* ---------- Geçmiş · Şimdi · Gelecek ---------- */
  function threeCard(cards) {
    const [P, N, F] = cards;
    const seed = seedOf(cards);
    const tones = cards.map(x => cat(toneOf(x.card, x.rev)));
    const [tp, tn, tf] = tones;

    // 1. Hikâye ve ton yayı
    const story = [pick(seed, [
      `Hikâye ${nm(P.card, P.rev)} ile başlıyor (<i>${kw(P.card, P.rev)}</i>), bugün ${nm(N.card, N.rev)} ile sürüyor (<i>${kw(N.card, N.rev)}</i>) ve ${nm(F.card, F.rev)} yönüne ilerliyor (<i>${kw(F.card, F.rev)}</i>).`,
      `Geçmişten ${nm(P.card, P.rev)} (<i>${kw(P.card, P.rev)}</i>), bugünden ${nm(N.card, N.rev)} (<i>${kw(N.card, N.rev)}</i>), yarından ise ${nm(F.card, F.rev)} (<i>${kw(F.card, F.rev)}</i>) konuşuyor.`,
    ])];
    if (tones.every(t => t === 'pos')) story.push('Üç kart da olumlu: enerji akıyor, kartlar sana yeşil ışık yakıyor.');
    else if (tones.every(t => t === 'neg')) story.push('Zorlu bir tablo — ama tarot kaderi değil yönü gösterir. Kartlar nelere dikkat etmen gerektiğini anlatıyor.');
    else if (tp === 'neg' && tf === 'pos') story.push('Zorlu bir geçmişten aydınlık bir geleceğe: bu bir iyileşme ve yükseliş hikâyesi.');
    else if (tp === 'pos' && tf === 'neg') story.push('Geçmişteki iyi enerji geleceğe taşınmıyor gibi görünüyor. Bu bir uyarı: neyin değiştiğine dikkat et.');
    else if (tn === 'neg' && tf === 'pos') story.push('Şu anki zorluk geçici; kartlar düzelmeyi gösteriyor.');
    else if (tn === 'pos' && tf === 'neg') story.push('Şu an işler yolunda, ama gelecek kartı dikkatli olmayı öğütlüyor.');
    else if (tf === 'pos') story.push('Hikâye olumlu bir yöne ilerliyor.');
    else if (tf === 'neg') story.push('Gelecek kartı zorlayıcı: bunu kesin bir kader değil, şimdiden önlem alabileceğin bir ihtimal olarak gör.');
    else story.push('Dengeli bir tablo: ne büyük bir iniş ne de büyük bir çıkış var; sonucu senin adımların belirleyecek.');

    // 2. Kartlar arası bağ: elementler
    const bond = [];
    const els = cards.map(x => elementOf(x.card));
    const pn = pairInfo(els[0], els[1]), nf = pairInfo(els[1], els[2]);
    const elLabel = (a, b) => a === b ? `${ELEMENT_NAME[a]}` : `${ELEMENT_NAME[a]}–${ELEMENT_NAME[b]}`;
    if (pn === nf && pn[0] !== 'neutral') bond.push(`Geçmişten geleceğe aynı ilişki sürüyor (${elLabel(els[0], els[1])}): ${pn[1]}.`);
    else {
      if (pn[0] !== 'neutral') bond.push(`Geçmiş ile şimdi arasında (${elLabel(els[0], els[1])}): ${pn[1]}.`);
      if (nf[0] !== 'neutral') bond.push(`Şimdi ile gelecek arasında (${elLabel(els[1], els[2])}): ${nf[1]}.`);
    }
    const helped = x => x[0] === 'same' || x[0] === 'friend';
    if (helped(pn) && helped(nf)) bond.push(`Şimdi kartı iki yandan da destekleniyor; ${N.card.name} enerjisi şu an güçlü biçimde yaşanıyor.`);
    else if (pn[0] === 'enemy' && nf[0] === 'enemy') bond.push(`Şimdi kartı iki yandan da zorlanıyor; ${N.card.name} enerjisi şu an zayıf ya da beklenenden farklı yaşanabilir.`);
    if (!bond.length) bond.push('Kartların elementleri birbirine karşı nötr: her biri kendi alanında, ayrı ayrı etkili.');

    // Takım geçişi
    const doms = cards.map(x => domainOf(x.card));
    if (doms[0] === doms[1] && doms[1] === doms[2]) {
      bond.push(doms[0] === 'major'
        ? 'Üç kart da Büyük Arkana: hayatında kader niteliğinde, büyük bir dönem yaşanıyor.'
        : `Üç kart da ${SUIT_NAME[doms[0]]}: mesele tamamen ${DOMAIN[doms[0]]} alanında.`);
    } else if (doms[0] === doms[2]) {
      bond.push(`Konu ${DOMAIN[doms[0]]} alanında başlıyor ve yine orada çözülüyor; arada ${DOMAIN[doms[1]]} alanından bir etki var.`);
    } else {
      bond.push(`Odak, ${DOMAIN[doms[0]]} alanından ${DOMAIN[doms[2]]} alanına kayıyor.`);
    }

    // 3. Dikkat çekenler
    const notes = [];
    const majors = cards.map((x, i) => x.card.arcana === 'major' ? i : -1).filter(i => i >= 0);
    if (majors.length === 0) notes.push('Hiç Büyük Arkana yok: bu durum tamamen senin elinde; gündelik seçimlerin sonucu belirleyecek.');
    else if (majors.length === 1) notes.push([
      'Geçmişteki Büyük Arkana kartı, bugünü hâlâ şekillendiren büyük bir olayı işaret ediyor.',
      'Şimdi kartı Büyük Arkana: şu an önemli bir eşiktesin, bu dönem sıradan değil.',
      'Gelecek kartı Büyük Arkana: önündeki gelişme küçük bir olay değil, hayatına iz bırakacak bir dönüm noktası.',
    ][majors[0]]);
    else if (majors.length === 2) {
      const [a, b] = majors.map(i => cards[i].card.n);
      notes.push(b > a
        ? `İki Büyük Arkana kartı ileriye doğru ilerliyor (${cards[majors[0]].card.top} → ${cards[majors[1]].card.top}): ruhsal bir olgunlaşma yaşıyorsun.`
        : `İki Büyük Arkana kartı var: büyük güçler devrede ve bir ders tekrar önüne geliyor olabilir.`);
    }

    // Sayılar
    if (cards.every(x => pip(x.card))) {
      const r = cards.map(x => x.card.rank);
      if (r[0] < r[1] && r[1] < r[2]) notes.push(`Sayılar artıyor (${r.join(' → ')}): süreç olgunlaşıyor, olaylar doğal akışında ilerliyor.`);
      else if (r[0] > r[1] && r[1] > r[2]) notes.push(`Sayılar azalıyor (${r.join(' → ')}): bir şey başa dönüyor; eski bir konu yeniden açılabilir ya da yeni bir döngü başlıyor.`);
    }
    const ranks = cards.filter(x => pip(x.card)).map(x => x.card.rank);
    const dup = ranks.find((r, i) => ranks.indexOf(r) !== i);
    if (dup) notes.push(`${dup} sayısı tekrar ediyor: <i>${NUMBER_STAGE[dup]}</i> teması bu açılımın ana konusu.`);
    if (pip(F.card) && F.card.rank === 1) notes.push('Gelecekte bir As var: yepyeni bir sayfa açılıyor.');
    if (pip(N.card) && N.card.rank === 10) notes.push('Şimdi kartı bir On: bir döngü kapanmak üzere.');
    if (pip(F.card) && F.card.rank === 10) notes.push('Gelecekte bir On var: bu süreç tamamlanıp sonuçlanacak.');

    // Ters kartlar
    if (cards.every(x => x.rev)) notes.push('Üç kart da ters: bu dönem içe dönme, bekleme ve iç engelleri çözme zamanı.');
    else {
      // Zorlayıcı bir kartın tersi rahatlama, olumlu bir kartın tersi tıkanıklık demektir
      const eased = x => baseTone(x.card) < 0;
      if (P.rev) notes.push(eased(P)
        ? 'Geçmiş kartı ters: geçmişteki zor dönemin etkisi azalmış; o yükü büyük ölçüde geride bırakmışsın.'
        : 'Geçmiş kartı ters: geçmişte kapanmamış, hâlâ çözülmeyi bekleyen bir konu var.');
      if (N.rev) notes.push(eased(N)
        ? 'Şimdi kartı ters: zorlu enerji hafifliyor; en kötüsü geride kalıyor olabilir.'
        : 'Şimdi kartı ters: enerji şu an tıkalı ya da içe dönük; dışarıdan görünmeyen bir iç süreç yaşanıyor.');
      if (F.rev) notes.push(eased(F)
        ? 'Gelecek kartı ters: beklenen zorluk düşündüğünden hafif geçebilir.'
        : 'Gelecek kartı ters: gelecek henüz kesinleşmemiş. Bugünkü seçimlerin bu sonucu değiştirebilir.');
    }

    // Saray kartları
    const courts = cards.map((x, i) => [x, i]).filter(([x]) => x.card.court);
    courts.forEach(([x, i]) => notes.push(`${POS_LOC[i]} ${nm(x.card, x.rev)}: ${COURT_PERSON[x.card.rank]}.`));
    if (courts.length >= 2) notes.push('Birden fazla saray kartı: bu hikâyede başka insanlar belirleyici bir rol oynuyor.');

    // Bilinen ikililer
    const ids = cards.map(x => x.card.id);
    PAIRS.forEach(([a, b, text]) => {
      if (ids.includes(a) && ids.includes(b)) {
        const anyRev = cards.some(x => (x.card.id === a || x.card.id === b) && x.rev);
        notes.push(text + (anyRev ? ' Ters kart yüzünden bu süreç daha yavaş işleyebilir.' : ''));
      }
    });

    // 4. Tavsiye
    const advice = [];
    if (F.card.arcana === 'major') advice.push(F.rev
      ? `${nm(F.card, F.rev)}: kartın özü şu — ${F.card.meaning.charAt(0).toLocaleLowerCase('tr-TR') + F.card.meaning.slice(1)} Ters geldiği için bu mesajın önünde bir engel var: <i>${kw(F.card, F.rev)}</i>.`
      : `${nm(F.card, F.rev)}: ${F.card.meaning}`);
    else if (tf === 'neg') advice.push(`Önündeki dönemde ${SUIT_ADVICE[F.card.suit]}. ${nm(F.card, F.rev)} şu konularda seni uyarıyor: <i>${kw(F.card, F.rev)}</i>. Bunları önceden fark etmek, yaşanmalarını engelleyebilir.`);
    else advice.push(`Önündeki dönemde ${SUIT_ADVICE[F.card.suit]}. ${nm(F.card, F.rev)} sana <i>${kw(F.card, F.rev)}</i> enerjisini getiriyor.`);
    if (F.rev && baseTone(F.card) >= 0) advice.push('Ama önce önündeki tıkanıklığı fark et ve çözmeye çalış.');
    if (N.card.arcana === 'minor' && N.card.suit !== (F.card.suit || null)) {
      advice.push(`Bugün için: ${SUIT_ADVICE[N.card.suit]}.`);
    }

    const out = [
      { title: 'Hikâye', items: story },
      { title: 'Kartlar arası bağ', items: bond },
    ];
    if (notes.length) out.push({ title: 'Dikkat çekenler', items: notes });
    out.push({ title: 'Tavsiye', items: advice });
    return out;
  }

  window.interpretReading = function (cards) {
    if (cards.length === 1) return daily(cards[0]);
    if (cards.length === 3) return threeCard(cards);
    return null; // eski 5 ve 10 kartlık açılımlar
  };
})();
