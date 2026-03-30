fetch("https://ykawase5048.github.io/yutokawase/databases/papers.json")
//fetch("../databases/papers.json")
    .then(response => response.json())
    .then(data => {
        renderPapers(data);
    });

// Papers
function renderPapers(data) {
    // Publications
    const pubContainer = document.getElementById("publications-container");
    const pubs = data.publications;
    const buttonTypes = data["button-types"];

    for (let i = pubs.length - 1; i >= 0; i--) {
        const entry = pubs[i];
        const number = i + 1;

        const div = document.createElement("div");
        div.className = "pub-item";
        div.id = "publish-" + number; // <- 各要素にユニークID

        // ボタン生成
        let btnHTML = "";
        for (const btn of entry.buttons) {
            const cfg = buttonTypes[btn.type];
            if (!cfg) continue;

            let hreflink = ""; 
            if (btn.isLocked) {
                hreflink = "#"
            } else if (btn.type === "doi") {
                hreflink = "https://doi.org/" + entry.doi
            } else {
                hreflink = btn.link
            };

            const disabled = btn.isLocked ? "disabled" : "";
            
            if (btn.type === "doi") {
                btnHTML += `
                    <a class="btn btn-outline-secondary btn-sm ${disabled}"
                    href="${hreflink}"
                    target="_blank" role="button">
                        <div>
                            <img src="${cfg.icon}" width="20" height="20">
                            ${cfg.text}
                        </div>
                    </a>
                `;
            }else {
                btnHTML += `
                    <a class="btn btn-outline-secondary btn-sm ${disabled}"
                    href="${btn.isLocked ? "#" : btn.link}"
                    target="_blank" role="button">
                        <div>
                            <img src="${cfg.icon}" width="20" height="20">
                            ${cfg.text}
                        </div>
                    </a>
                `;
            };
        };

        div.innerHTML = `
            <div class="pub-index">
                <h4 class="font-weight-light mb-0">
                    ${number}.
                </h4>
            </div>

            <div>
                <div class="pub-title">
                    <h4 class="font-weight-light mb-0">
                        ${entry.title}
                        ${btnHTML}
                    </h4>
                </div>

                <div class="pub-info">
                    <h6 class="font-weight-light">
                        ${entry.journal}
                        <span style="margin-left:0.2em;">
                            -
                        </span>
                        <span style="margin-left:0.2em;">
                            ${entry.year}
                        </span>
                    </h6>
                </div>
            </div>
        `;
        pubContainer.appendChild(div);
    }

    // Preprints
    const preContainer = document.getElementById("preprints-container");
    const pres = data.preprints;

    for (let i = pres.length - 1; i >= 0; i--) {
        const entry = pres[i];
        const number = i + 1;
        const dateWithNote = entry.note ? `${entry.date} (${entry.note})` : entry.date;

        const div = document.createElement("div");
        div.className = "pub-item";
        div.id = "preprint-" + number; // <- 各要素にユニークID

        div.innerHTML = `
            <div class="pub-index">
                <h4 class="font-weight-light mb-0">
                    ${number}.
                </h4>
            </div>

            <div>
                <div class="pub-title">
                    <h4 class="font-weight-light mb-0">
                        ${entry.title}
                        ${entry.arxiv ? `
                        <a class="btn btn-outline-secondary btn-sm" href="${entry.arxiv}" target="_blank">
                            <div>
                                <img src="./icons/arxiv-logomark-small.svg" width="20" height="20">
                                arXiv
                            </div>
                        </a>` : ''}
                    </h4>
                </div>

                <div class="pub-info">
                    <h6 class="font-weight-light">
                        ${dateWithNote}
                    </h6>
                </div>
            </div>
        `;
        preContainer.appendChild(div);
    }
}