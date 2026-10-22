# Russian registration screen font

`nomera-registration-ru.woff2` contains original compact outlines implemented for this project. The glyph drawings were visually guided by GOST R 50577-2018, appendices B and V; layout proportions were checked against A.1/A.2. It is a screen approximation, not a certification of manufacturing compliance.

Reference: https://byborg.ru/img/gost/GOST_R_50577-2018.pdf (official 2018 edition mirrored by a plate supplier). The reference PDF is not included in the website or source package.

Rebuild using `scripts/build-russian-plate-font.py` with Python fonttools and brotli. Only the resulting 1.9 KB WOFF2 is needed at runtime. No font service is contacted. Coverage includes digits, the twelve allowed Russian plate letters, Latin visual aliases and R/U/S.
