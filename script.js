const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".main-nav");

if (menuButton && navigation) {
	function closeMenu() {
		menuButton.setAttribute("aria-expanded", "false");
		menuButton.setAttribute("aria-label", "Abrir menu");
		navigation.classList.remove("is-open");
	}

	menuButton.addEventListener("click", () => {
		const isOpen = menuButton.getAttribute("aria-expanded") === "true";
		menuButton.setAttribute("aria-expanded", String(!isOpen));
		menuButton.setAttribute("aria-label", isOpen ? "Abrir menu" : "Fechar menu");
		navigation.classList.toggle("is-open", !isOpen);
	});

	navigation.addEventListener("click", (event) => {
		if (event.target instanceof Element && event.target.closest("a")) {
			closeMenu();
		}
	});

	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
			closeMenu();
			menuButton.focus();
		}
	});

	document.addEventListener("click", (event) => {
		if (event.target instanceof Node && !navigation.contains(event.target) && !menuButton.contains(event.target)) {
			closeMenu();
		}
	});
}

const animatedElements = document.querySelectorAll(
	".hero-content, .hero-image, .highlights, .section-heading, .media-card, .project-book-card, .feature, .quote, .timeline-item"
);

if ("IntersectionObserver" in window) {
	const revealObserver = new IntersectionObserver((entries, observer) => {
		entries.forEach((entry) => {
			if (!entry.isIntersecting) return;
			entry.target.classList.add("is-visible");
			observer.unobserve(entry.target);
		});
	}, { threshold: 0.12, rootMargin: "0px 0px -40px" });

	animatedElements.forEach((element, index) => {
		element.style.transitionDelay = `${Math.min(index % 6, 5) * 60}ms`;
		revealObserver.observe(element);
	});
} else {
	animatedElements.forEach((element) => element.classList.add("is-visible"));
}

const dilemmaDialog = document.querySelector("#dilemma-dialog");
const dilemmaClose = document.querySelector("#dilemma-close");
const dilemmaOpen = document.querySelector("#dilemma-open");
const dilemmaForm = document.querySelector("#dilemma-form");
const dilemmaConfirm = document.querySelector("#dilemma-confirm");
const dilemmaResult = document.querySelector("#dilemma-result");
const adminDialog = document.querySelector("#admin-dialog");
const adminOpen = document.querySelector("#admin-open");
const adminClose = document.querySelector("#admin-close");
const adminLoginView = document.querySelector("#admin-login-view");
const adminLoginForm = document.querySelector("#admin-login-form");
const adminEmail = document.querySelector("#admin-email");
const adminPassword = document.querySelector("#admin-password");
const adminPasswordConfirm = document.querySelector("#admin-password-confirm");
const adminPasswordConfirmWrap = document.querySelector("#admin-password-confirm-wrap");
const adminLoginSubmit = document.querySelector("#admin-login-submit");
const adminAuthStatus = document.querySelector("#admin-auth-status");
const adminDashboard = document.querySelector("#admin-dashboard");

const localResponseKey = "cnm-local-dilemma-responses-v1";
const localParticipantKey = "cnm-local-participant-id-v1";
const localVisitsKey = "cnm-local-page-views-v1";
const localAdminKey = "cnm-local-admin-credential-v1";
const localAdminEmail = "a2758@colegionovodamaia.pt";
const answerOptions = ["A", "B", "C", "D"];

function readLocalResponses() {
	try {
		const parsed = JSON.parse(localStorage.getItem(localResponseKey) || "[]");
		return Array.isArray(parsed)
			? parsed.filter((record) =>
				record &&
				typeof record.participantId === "string" &&
				answerOptions.includes(record.answer) &&
				typeof record.updatedAt === "string"
			)
			: [];
	} catch (error) {
		console.warn("Não foi possível ler as respostas guardadas neste navegador:", error);
		return [];
	}
}

function saveLocalResponses(responses) {
	try {
		localStorage.setItem(localResponseKey, JSON.stringify(responses));
		return true;
	} catch (error) {
		console.error("Não foi possível guardar a resposta neste navegador:", error);
		return false;
	}
}

function getLocalParticipantId() {
	try {
		let id = localStorage.getItem(localParticipantKey);
		if (!id) {
			id = typeof crypto.randomUUID === "function"
				? crypto.randomUUID()
				: Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
			localStorage.setItem(localParticipantKey, id);
		}
		return id;
	} catch (error) {
		console.error("Não foi possível criar um identificador local para a resposta:", error);
		return null;
	}
}

function recordLocalPageView() {
	try {
		const visits = Number.parseInt(localStorage.getItem(localVisitsKey) || "0", 10);
		localStorage.setItem(localVisitsKey, String((Number.isFinite(visits) ? visits : 0) + 1));
	} catch (error) {
		console.warn("Não foi possível contar esta visita neste navegador:", error);
	}
}

recordLocalPageView();

if (dilemmaDialog instanceof HTMLDialogElement && dilemmaForm instanceof HTMLFormElement) {
	let dilemmaWasHandled = false;
	let dilemmaOpenedAutomatically = false;

	function showPercentages(responses) {
		const total = responses.length;
		answerOptions.forEach((key) => {
			const count = responses.filter((response) => response.answer === key).length;
			const percent = total ? Math.round((count / total) * 100) : 0;
			const percentLabel = dilemmaDialog.querySelector(`[data-answer-percent="${key}"]`);
			const bar = dilemmaDialog.querySelector(`[data-answer-bar="${key}"]`);
			if (percentLabel && bar) {
				percentLabel.textContent = `${percent}% das respostas`;
				percentLabel.hidden = false;
				bar.hidden = false;
				bar.style.setProperty("--dilemma-width", `${percent}%`);
			}
		});
		dilemmaResult.textContent = `Resultados: ${total} ${total === 1 ? "resposta" : "respostas"} neste navegador.`;
		dilemmaResult.hidden = false;
	}

	const participantId = getLocalParticipantId();
	if (participantId) {
		try {
			const previousAnswer = localStorage.getItem("cnm-dilemma-voted-v2");
			const existingResponses = readLocalResponses();
			if (answerOptions.includes(previousAnswer) && !existingResponses.some((response) => response.participantId === participantId)) {
				existingResponses.push({ participantId, answer: previousAnswer, updatedAt: new Date().toISOString() });
				if (saveLocalResponses(existingResponses)) {
					localStorage.removeItem("cnm-dilemma-voted-v2");
				}
			}
		} catch (error) {
			console.warn("Não foi possível migrar a resposta anterior:", error);
		}
	}

	dilemmaForm.addEventListener("change", () => {
		dilemmaConfirm.disabled = !dilemmaForm.querySelector("input[name='dilemma-answer']:checked");
	});

	dilemmaForm.addEventListener("submit", (event) => {
		event.preventDefault();
		const answer = dilemmaForm.querySelector("input[name='dilemma-answer']:checked");
		if (!answer || !participantId) {
			dilemmaResult.textContent = "Não foi possível registar a resposta neste navegador.";
			dilemmaResult.hidden = false;
			return;
		}

		const responses = readLocalResponses();
		const responseIndex = responses.findIndex((response) => response.participantId === participantId);
		const response = { participantId, answer: answer.value, updatedAt: new Date().toISOString() };
		if (responseIndex >= 0) {
			responses[responseIndex] = response;
		} else {
			responses.push(response);
		}
		if (!saveLocalResponses(responses)) {
			dilemmaResult.textContent = "Não foi possível guardar a resposta. Verifica as permissões de armazenamento do navegador.";
			dilemmaResult.hidden = false;
			return;
		}
		showPercentages(responses);
		renderAdminDashboard();
		dilemmaConfirm.textContent = "Resposta selecionada";
		dilemmaConfirm.disabled = true;
	});

	dilemmaClose?.addEventListener("click", () => dilemmaDialog.close());
	dilemmaOpen?.addEventListener("click", () => {
		dilemmaWasHandled = true;
		if (!dilemmaDialog.open) dilemmaDialog.showModal();
	});
	dilemmaDialog.addEventListener("click", (event) => {
		if (event.target === dilemmaDialog) dilemmaDialog.close();
	});
	dilemmaDialog.addEventListener("close", () => {
		dilemmaWasHandled = true;
	});

	function openAutomaticDilemma() {
		if (dilemmaWasHandled || dilemmaDialog.open || dilemmaOpenedAutomatically) return;
		if (adminDialog instanceof HTMLDialogElement && adminDialog.open) {
			adminDialog.addEventListener("close", openAutomaticDilemma, { once: true });
			return;
		}
		dilemmaOpenedAutomatically = true;
		dilemmaDialog.showModal();
	}

	window.setTimeout(openAutomaticDilemma, 7000);
}

function renderAdminDashboard() {
	if (!(adminDashboard instanceof HTMLElement)) return;
	const responses = readLocalResponses().sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
	const totalResponses = responses.length;
	const counts = Object.fromEntries(answerOptions.map((answer) => [
		answer,
		responses.filter((response) => response.answer === answer).length
	]));
	const responseCount = document.querySelector("#admin-response-count");
	const visitCount = document.querySelector("#admin-visit-count");
	const rows = document.querySelector("#admin-response-rows");
	const emptyState = document.querySelector("#admin-empty-responses");

	if (responseCount) responseCount.textContent = String(totalResponses);
	if (visitCount) {
		try {
			visitCount.textContent = String(Number.parseInt(localStorage.getItem(localVisitsKey) || "0", 10) || 0);
		} catch (error) {
			console.warn("Não foi possível ler a contagem de visitas:", error);
			visitCount.textContent = "Indisponível";
		}
	}
	answerOptions.forEach((answer) => {
		const result = document.querySelector(`[data-admin-count="${answer}"]`);
		if (result) {
			const percent = totalResponses ? Math.round((counts[answer] / totalResponses) * 100) : 0;
			result.textContent = `${counts[answer]} (${percent}%)`;
		}
	});

	if (rows) {
		rows.replaceChildren();
		responses.forEach((response) => {
			const row = document.createElement("tr");
			const idCell = document.createElement("td");
			const answerCell = document.createElement("td");
			const dateCell = document.createElement("td");
			idCell.textContent = response.participantId.slice(0, 8);
			answerCell.textContent = `Resposta ${response.answer}`;
			dateCell.textContent = new Date(response.updatedAt).toLocaleString("pt-PT");
			row.append(idCell, answerCell, dateCell);
			rows.append(row);
		});
	}
	if (emptyState) emptyState.hidden = totalResponses > 0;
}

async function hashLocalPassword(password, saltBase64) {
	const salt = Uint8Array.from(atob(saltBase64), (character) => character.charCodeAt(0));
	const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
	const bits = await crypto.subtle.deriveBits(
		{ name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" },
		key,
		256
	);
	return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

if (adminDialog instanceof HTMLDialogElement) {
	let credential = null;
	try {
		credential = JSON.parse(localStorage.getItem(localAdminKey) || "null");
	} catch (error) {
		console.warn("Não foi possível ler a configuração de acesso local:", error);
	}

	function setAuthStatus(message, isError) {
		if (!adminAuthStatus) return;
		adminAuthStatus.textContent = message;
		adminAuthStatus.classList.toggle("admin-auth-error", isError);
	}

	function updateLoginMode() {
		const isConfigured = Boolean(credential && credential.salt && credential.hash);
		if (adminPasswordConfirmWrap) adminPasswordConfirmWrap.hidden = isConfigured;
		if (adminPassword) adminPassword.autocomplete = isConfigured ? "current-password" : "new-password";
		if (adminPasswordConfirm) adminPasswordConfirm.required = !isConfigured;
		if (adminLoginSubmit) adminLoginSubmit.textContent = isConfigured ? "Iniciar sessão" : "Criar palavra-passe local";
		setAuthStatus(
			isConfigured
				? "Acesso local configurado. A palavra-passe só funciona neste navegador."
				: "Na primeira utilização, cria uma palavra-passe com pelo menos 8 caracteres.",
			false
		);
	}

	updateLoginMode();

	adminLoginForm?.addEventListener("submit", async (event) => {
		event.preventDefault();
		if (!(adminEmail instanceof HTMLInputElement) || !(adminPassword instanceof HTMLInputElement)) return;
		if (adminEmail.value.trim().toLowerCase() !== localAdminEmail) {
			setAuthStatus("Esta conta não está autorizada.", true);
			return;
		}
		if (adminPassword.value.length < 8) {
			setAuthStatus("A palavra-passe deve ter pelo menos 8 caracteres.", true);
			return;
		}

		try {
			if (!crypto.subtle) throw new Error("A encriptação local não está disponível neste navegador.");
			if (!credential) {
				if (!(adminPasswordConfirm instanceof HTMLInputElement) || adminPassword.value !== adminPasswordConfirm.value) {
					setAuthStatus("As palavras-passe não coincidem.", true);
					return;
				}
				const saltBytes = crypto.getRandomValues(new Uint8Array(16));
				const salt = btoa(String.fromCharCode(...saltBytes));
				credential = { salt, hash: await hashLocalPassword(adminPassword.value, salt) };
				localStorage.setItem(localAdminKey, JSON.stringify(credential));
			} else {
				const enteredHash = await hashLocalPassword(adminPassword.value, credential.salt);
				if (enteredHash !== credential.hash) {
					setAuthStatus("Palavra-passe incorreta.", true);
					return;
				}
			}

			if (adminLoginView) adminLoginView.hidden = true;
			if (adminDashboard) adminDashboard.hidden = false;
			adminPassword.value = "";
			if (adminPasswordConfirm instanceof HTMLInputElement) adminPasswordConfirm.value = "";
			renderAdminDashboard();
		} catch (error) {
			console.error("Não foi possível iniciar a sessão local:", error);
			setAuthStatus("Não foi possível iniciar sessão neste navegador. Abre o site através de um servidor local e tenta novamente.", true);
		}
	});

	adminOpen?.addEventListener("click", () => {
		if (adminDashboard) adminDashboard.hidden = true;
		if (adminLoginView) adminLoginView.hidden = false;
		updateLoginMode();
		adminDialog.showModal();
	});
	adminClose?.addEventListener("click", () => adminDialog.close());
	document.querySelector("#admin-logout")?.addEventListener("click", () => {
		if (adminDashboard) adminDashboard.hidden = true;
		if (adminLoginView) adminLoginView.hidden = false;
		if (adminLoginForm instanceof HTMLFormElement) adminLoginForm.reset();
		updateLoginMode();
	});
	document.querySelector("#admin-export")?.addEventListener("click", () => {
		const responses = readLocalResponses();
		const escapeCell = (value) => `"${String(value).replace(/"/g, '""')}"`;
		const lines = [
			["Identificador anónimo", "Resposta", "Data/hora"],
			...responses.map((response) => [
				response.participantId,
				response.answer,
				new Date(response.updatedAt).toLocaleString("pt-PT")
			])
		];
		const csv = `\uFEFF${lines.map((line) => line.map(escapeCell).join(";")).join("\r\n")}`;
		const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
		const download = document.createElement("a");
		download.href = url;
		download.download = "respostas-dilema.csv";
		document.body.append(download);
		download.click();
		download.remove();
		window.setTimeout(() => URL.revokeObjectURL(url), 1000);
	});
	adminDialog.addEventListener("click", (event) => {
		if (event.target === adminDialog) adminDialog.close();
	});
}
