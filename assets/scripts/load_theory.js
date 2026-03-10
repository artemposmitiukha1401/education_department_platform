async function loadTheoryData() {
  const titleElement = document.getElementById("subject-title");
  const container = document.getElementById("topics-list");
  const template = document.getElementById("topic-template");

  const subjectId = parseInt(
    new URLSearchParams(window.location.search).get("id"),
  );
  if (!subjectId) {
    titleElement.innerText = "Помилка: ID не вказано";
    return;
  }

  try {
    const response = await fetch("../assets/data/subjects_topics.json");
    const subjects = await response.json();

    const currentSubject = subjects.find((s) => s.id === subjectId);
    if (!currentSubject) {
      titleElement.innerText = "Предмет не знайдено";
      return;
    }

    titleElement.innerText = currentSubject.subject_name;

    if (currentSubject.topics?.length > 0) {
      currentSubject.topics.forEach((topic) => {
        const clone = template.content.cloneNode(true);
        clone.querySelector(".topic-name").innerText = topic.name;
        clone.querySelector(".view-packages-btn").href =
          `packages_template_page.html?topic_id=${topic.id}`;
        container.appendChild(clone);
      });
    } else {
      container.innerHTML = "<p>У цього предмета поки немає тем.</p>";
    }
  } catch {
    titleElement.innerText = "Помилка завантаження даних";
  }
}

document.addEventListener("DOMContentLoaded", loadTheoryData);
