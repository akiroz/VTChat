/// <reference types="vite/client" />

import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

i18next.use(LanguageDetector).use(initReactI18next).init({
    debug: import.meta.env.DEV,
    fallbackLng: "en",
    supportedLngs: ["en", "ja"],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    resources: {
        en: {
            translation: {
                links: {
                    home: "VTChat",
                    about: "About",
                    faq: "FAQ",
                    cookie: "Cookie Policy",
                    privacy: "Privacy Policy",
                    tos: "Terms & Conditions",
                    systemStatus: "System Status",
                },
                keyword: "Keyword",
                search: "Search",
                advancedSearch: "Advanced Search",
                channel: "Channel",
                beforeDate: "Before Date",
                tags: "Tags",
                desc: "Search chat messages in VTuber livestreams",
                noResult: "No results found.",
                result: "Showing {{n}} results for:",
                page: "Page {{n}}"
            },
        },
        ja: {
            translation: {
                links: {
                    home: "ホーム",
                    about: "サイトについて",
                    faq: "よくある質問",
                    cookie: "クッキーポリシー",
                    privacy: "プライバシポリシー",
                    tos: "利用規約",
                    systemStatus: "システム状態",
                },
                keyword: "キーワード",
                search: "検査",
                advancedSearch: "検索オプション",
                channel: "チャンネル",
                beforeDate: "日付以前",
                tags: "タグ",
                desc: "VTuber配信コメント検査",
                noResult: "結果はありません。",
                result: "ページ結果 {{n}} 件",
                page: "ページ {{n}}"
            },
        },
    },
});