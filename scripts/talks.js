fetch("talks.json")
    .then(response => response.json())
    .then(data => {
        renderTalks(data);
    });

// Talks を描画
function renderTalks(data) {
    const container = document.getElementById("talks-container");
    const talks = data.talks;
    const buttonTypes = data["button-types"];

    for (let i = talks.length - 1; i >= 0; i--) {
        const t = talks[i];

        const div = document.createElement("div");
        div.className = "talk-item";

        // ボタン生成
        let btnHTML = "";
        for (const btn of t.buttons) {
            const cfg = buttonTypes[btn.type];
            if (!cfg) continue;

            const disabled = btn.isLocked ? "disabled" : "";
            btnHTML += `
                <a class="btn btn-outline-secondary btn-sm ${disabled}"
                   href="${btn.isLocked ? "#" : btn.link}"
                   target="_blank" role="button">
                    <div>
                        <img src="${cfg.icon}" width="16" height="16">
                        ${cfg.text}
                    </div>
                </a>
            `;
        }

        let preprintsHTML = "";
        for (const preprintNo of t.preprints) {
            preprintsHTML += `
                <a href="./paper.html#preprint-${preprintNo}" class="hover-info" style="font-size: 0.8rem;">
                    [${preprintNo}]
                    <span class="hover-text">
                        source preprint
                    </span>
                </a>
            `;
        }

        div.innerHTML = `
            <div class=talk-index>
                ${preprintsHTML}
            </div>

            <div>
                <div class=talk-title>
                    <h6 class="font-weight-normal mb-0" style="font-size: 1.0rem;">
                        ${t.title}
                        ${btnHTML}
                    </h6>
                </div>
                <div class=talk info>
                    <h6 class="small font-weight-light mb-0" style="font-size: 0.75rem;">
                        ${t.date}, ${t.city}, ${t.country}.
                    </h6>
                    <h6 class="small font-weight-light mb-0" style="font-size: 0.75rem;">
                        <a href="${t["event-url"]}" target="_blank">
                            <u>${t.event}</u>
                        </a>
                    </h6>
                </div>
            </div>
        `;

        container.appendChild(div);
    }
}