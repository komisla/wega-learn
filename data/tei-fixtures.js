// data/tei-fixtures.js
// Realistic TEI-XML fixtures from the WeGA (Weber-Gesamtausgabe) context.
// Stored as JS strings so the app needs no server (no CORS / fetch).
//
// Conventions mirrored from the real WeGA encoding:
//   - default namespace http://www.tei-c.org/ns/1.0
//   - @xml:id pattern like "A040001"
//   - @key pattern like "A002078" (person references)
//   - tei:correspDesc / tei:correspAction[@type='sent'|'received']
//   - tei:note[@type='commentary'] and tei:note[@type='textConst']
//   - tei:choice/tei:corr + tei:sic, tei:add, tei:del
//   - tei:rs[@type='work'] for work references

window.TEI_FIXTURES = {

  // ---------------------------------------------------------------------------
  // letter_001 — Weber letter (1817)
  // ---------------------------------------------------------------------------
  letter_001: `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0" xml:id="A040001">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Carl Maria von Weber an Caroline Brandt in Prag, 12. Februar 1817</title>
      </titleStmt>
      <sourceDesc>
        <correspDesc>
          <correspAction type="sent">
            <persName key="A002068">Carl Maria von Weber</persName>
            <date when="1817-02-12">12. Februar 1817</date>
            <placeName key="A000123">Dresden</placeName>
          </correspAction>
          <correspAction type="received">
            <persName key="A002078">Caroline Brandt</persName>
            <placeName key="A000456">Prag</placeName>
          </correspAction>
        </correspDesc>
      </sourceDesc>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <div type="letter">
        <p xml:id="p1">Meine innig geliebte <persName key="A002078">Lina</persName>! Schon wieder
          sind einige Tage vergangen, ohne dass ich Dir schreiben konnte. Die Proben zur
          <rs type="work" key="A110001">Freischütz</rs>-Ouvertüre nehmen all meine Zeit in Anspruch.</p>
        <p xml:id="p2">Gestern sprach ich mit <persName key="A002099">Friedrich Kind</persName> über
          das Textbuch. Er ist mit den <choice><corr>Änderungen</corr><sic>Endrungen</sic></choice>
          einverstanden. <add place="above">Auch Herr <persName key="A002101">Brühl</persName> lässt grüßen.</add></p>
        <p xml:id="p3">Die <rs type="work" key="A110002">Aufforderung zum Tanz</rs> habe ich
          <del>fast</del> beinahe vollendet. <note type="commentary">Weber arbeitete von 1815 bis 1819
          an mehreren Klavierwerken parallel.</note></p>
        <p xml:id="p4">Lebe wohl, mein Herz. <note type="textConst">Die Unterschrift ist im Original
          stark verblasst.</note> Dein treuer <persName key="A002068">Carl</persName>.</p>
      </div>
    </body>
  </text>
</TEI>`,

  // ---------------------------------------------------------------------------
  // letter_002 — second letter, different context (for FLWOR comparisons)
  // ---------------------------------------------------------------------------
  letter_002: `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0" xml:id="A040002">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Caroline Brandt an Carl Maria von Weber, 20. Februar 1817</title>
      </titleStmt>
      <sourceDesc>
        <correspDesc>
          <correspAction type="sent">
            <persName key="A002078">Caroline Brandt</persName>
            <date when="1817-02-20">20. Februar 1817</date>
            <placeName key="A000456">Prag</placeName>
          </correspAction>
          <correspAction type="received">
            <persName key="A002068">Carl Maria von Weber</persName>
            <placeName key="A000123">Dresden</placeName>
          </correspAction>
        </correspDesc>
      </sourceDesc>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <div type="letter">
        <p xml:id="q1">Geliebter <persName key="A002068">Carl</persName>! Dein Brief hat mich sehr
          erfreut. Die Reise nach <placeName key="A000123">Dresden</placeName> bereitet mir Sorgen.</p>
        <p xml:id="q2">Herr <persName key="A002099">Kind</persName> war gestern hier und sprach
          voll Lob über den <rs type="work" key="A110001">Freischütz</rs>.
          <note type="commentary">Friedrich Kind verfasste das Libretto zum Freischütz.</note></p>
        <p xml:id="q3">Ich zähle die Tage bis zu unserem Wiedersehen.
          <choice><corr>Tausend</corr><sic>Tasend</sic></choice> Grüße, Deine
          <persName key="A002078">Lina</persName>.</p>
      </div>
    </body>
  </text>
</TEI>`,

  // ---------------------------------------------------------------------------
  // person_001 — WeGA person record
  // ---------------------------------------------------------------------------
  person_001: `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0" xml:id="A002068">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>Carl Maria von Weber</title>
      </titleStmt>
      <sourceDesc>
        <bibl>WeGA Personendatensatz</bibl>
      </sourceDesc>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <person xml:id="A002068">
        <persName type="reg">Weber, Carl Maria von</persName>
        <persName type="alt">Carl Maria Friedrich Ernst von Weber</persName>
        <persName type="alt">Karl Maria von Weber</persName>
        <birth>
          <date when="1786-11-18">18. November 1786</date>
          <placeName key="A000789">Eutin</placeName>
        </birth>
        <death>
          <date when="1826-06-05">5. Juni 1826</date>
          <placeName key="A000999">London</placeName>
        </death>
        <idno type="GND">118629662</idno>
        <idno type="VIAF">76321889</idno>
        <occupation>Komponist</occupation>
        <occupation>Dirigent</occupation>
      </person>
    </body>
  </text>
</TEI>`,

  // ---------------------------------------------------------------------------
  // letters_collection — 5 short letters in one wrapper (multi-doc FLWOR)
  // ---------------------------------------------------------------------------
  letters_collection: `<?xml version="1.0" encoding="UTF-8"?>
<teiCorpus xmlns="http://www.tei-c.org/ns/1.0">
  <letter xml:id="A040010">
    <correspAction type="sent">
      <persName key="A002068">Carl Maria von Weber</persName>
      <date when="1817-03-01">1. März 1817</date>
    </correspAction>
    <correspAction type="received">
      <persName key="A002078">Caroline Brandt</persName>
    </correspAction>
    <p>Kurzer Gruß aus <placeName key="A000123">Dresden</placeName>.
      <rs type="work" key="A110001">Freischütz</rs> macht Fortschritte.</p>
  </letter>
  <letter xml:id="A040011">
    <correspAction type="sent">
      <persName key="A002078">Caroline Brandt</persName>
      <date when="1817-03-05">5. März 1817</date>
    </correspAction>
    <correspAction type="received">
      <persName key="A002068">Carl Maria von Weber</persName>
    </correspAction>
    <p>Ich freue mich auf Deinen Besuch.</p>
  </letter>
  <letter xml:id="A040012">
    <correspAction type="sent">
      <persName key="A002099">Friedrich Kind</persName>
      <date when="1817-02-28">28. Februar 1817</date>
    </correspAction>
    <correspAction type="received">
      <persName key="A002068">Carl Maria von Weber</persName>
    </correspAction>
    <p>Das Textbuch zum <rs type="work" key="A110001">Freischütz</rs> ist fertig.</p>
  </letter>
  <letter xml:id="A040013">
    <correspAction type="sent">
      <persName key="A002068">Carl Maria von Weber</persName>
      <date when="1817-04-10">10. April 1817</date>
    </correspAction>
    <correspAction type="received">
      <persName key="A002101">Karl von Brühl</persName>
    </correspAction>
    <p>Hochverehrter Herr Graf, anbei die Partitur.</p>
  </letter>
  <letter xml:id="A040014">
    <correspAction type="sent">
      <persName key="A002078">Caroline Brandt</persName>
      <date when="1817-04-15">15. April 1817</date>
    </correspAction>
    <correspAction type="received">
      <persName key="A002099">Friedrich Kind</persName>
    </correspAction>
    <p>Vielen Dank für die freundlichen Worte.</p>
  </letter>
</teiCorpus>`,

  // ---------------------------------------------------------------------------
  // nested_list — nested tei:list (for XSLT recursion challenge)
  // ---------------------------------------------------------------------------
  nested_list: `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0" xml:id="A040050">
  <text>
    <body>
      <list>
        <item>Opern<list>
          <item>Freischütz</item>
          <item>Euryanthe</item>
        </list></item>
        <item>Klavierwerke</item>
      </list>
    </body>
  </text>
</TEI>`

};
