fetch("https://ykawase5048.github.io/yutokawase/papers.json")
    .then(response => response.json())
    .then(data => {
        renderPublications(data.publications, "publications-container");
        renderPreprints(data.preprints, "preprints-container");
    });

// Publications
function renderPublications(list, containerId) {
    const container = document.getElementById(containerId);

    for (let i = list.length - 1; i >= 0; i--) {
        const entry = list[i];
        const number = i + 1;

        const div = document.createElement("div");
        div.className = "pub-item";
        div.id = "publish-" + number; // <- 各要素にユニークID

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
                        <a class="btn btn-outline-secondary btn-sm" href="https://doi.org/${entry.doi}" target="_blank">
                            <div>
                                <img src="./icons/paper_plane.svg" width="20" height="20">
                                DOI
                            </div>
                        </a>
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
        container.appendChild(div);
    }
}

// Preprints
function renderPreprints(list, containerId) {
    const container = document.getElementById(containerId);

    for (let i = list.length - 1; i >= 0; i--) {
        const entry = list[i];
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
        container.appendChild(div);
    }
}