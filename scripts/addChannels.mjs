import env from "dotenv";

env.config()

const channels = {
    "UC_1Gq60351AILDqzA7R9wFw": { tags: {"Varium":1} },
    "UCAhrgF4MkqEXkBhHIqeY0Rg": { tags: {"Varium":1} },
    "UCAT7Vnk5vwlsg805s4_ZZTw": { tags: {"Varium":1}, active:false },
    "UCAytwphRHoPcvLr_qRvn3Zw": { tags: {"Varium":1} },
    "UCdQ9LnNR6DTj52nrpRggexg": { tags: {"Varium":1} },
    "UCLS28fzx6TqoccWmjzrG2YA": { tags: {"Varium":1} },
    "UCoqSuOp1CpewXVdlA5SLvKg": { tags: {"Varium":1} },
    "UCTzY8TqG9Y1LNcKC1ywTsig": { tags: {"Varium":1} },
    "UCu0IEm_0Vrw444Ng2EEogwg": { tags: {"Varium":1} },
    "UCxOTQ01cBN86_QX3jbNnW7g": { tags: {"Varium":1} },
    "UCZruZCE1YtqXYKufY6_owag": { tags: {"Varium":1} },
    "UCej9K_bcaQdvDh49RkHYsUw": { tags: {"Specialite":1} }, // @nano_kozuya
    "UC_bxkbJzxRKssMf52wVbssw": { tags: {"Specialite":1} }, // @koma_oboro
    "UC9Vq5c7FKEHLstvmSAsogXQ": { tags: {"Specialite":1} }, // @aisaka_siu
    "UC5UPG3fV3zzuq-JLPw-XdWQ": { tags: {"Specialite":1} }, // @azusa_honami
    "UCm4QiJHdsgz9PshJkGMSk5w": { tags: {"Specialite":1} }, // @minya_scott
    "UCwBmSNUOWnowsju5YG7dT6g": { tags: {"Specialite":1} }, // @tsukasa_ryogoku
    "UCHt4F3--Hq0sNXP6DEdlSmg": { tags: {"Specialite":1} }, // @MikiHitsugi
    "UCPm_htRQjzhgFikcO_LTvTA": { tags: {"Specialite":1} }, // @UtahimeMochizuki
    "UCo9wBz0FkJwiLeagB8tWXCg": { tags: {"Specialite":1} }, // @Victoria-Valerie
    "UCchGYP5t5Vz48UVxNOifk-Q": { tags: {"Specialite":1} }, // @MiuAkumiya
    "UC0OiQzb1_Xmq-0I9AYUjCew": { tags: {"MEWLIVE":1} }, // @musubigaou
    "UCQEqMSX5YYpQ9-4pdMip-vg": { tags: {"MEWLIVE":1} }, // @KumanoBearTrice
    "UCNH-swU7qbGTQftgUh1Veyg": { tags: {"MEWLIVE":1} }, // @Ririka_Tsukimia
    "UCRAP6PI9-BnPH3tYqWy1NKA": { tags: {"MEWLIVE":1} }, // @YunoMihanada
    "UCW-Nn0dm_kHTHObsQTOtlcw": { tags: {"MEWLIVE":1} }, // @Kurone_Yousagi
    "UC39D2lMvqRys9KBFueRWGtA": { tags: {"MEWLIVE":1} }, // @Roiro_Yamiyori
    "UCaGQRHO_siHMRkCsfvTcSMg": { tags: {"MEWLIVE":1} }, // @KonekoMiu
    "UCmLB7NCu7cmC7nhrN3fQE0g": { tags: {"MEWLIVE":1} }, // @nukunukunemumi
    "UCBQd84IW8OvM8H5jftHdvmw": {}, // @KamishiroKurea
    "UCMyvP0GM_l4khRYDZ5eKvxA": {}, // @HoshikageLapis
    "UC9VqnG2Yx--wWitfHvJRe9A": {}, // @user-qf6rg6su2h
};

await fetch("https://vtchat.akiroz.life/mgnt/channels", {
    method: "POST",
    body: JSON.stringify({ channels }),
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${Buffer.from(process.env.VTCHAT_MGNT_KEY + ":").toString("base64")}`
    }
});