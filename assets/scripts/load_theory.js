async function loadTheoryData() {
  const titleElement = document.getElementById("subject-title");
  const container = document.getElementById("topics-list");
  const template = document.getElementById("topic-template");

  // 1. Отримуємо ID з URL (наприклад, ?id=1)
  const params = new URLSearchParams(window.location.search);
  const subjectId = parseInt(params.get("id"));

  if (!subjectId) {
    titleElement.innerText = "Помилка: ID не вказано";
    return;
  }

  try {
    // 2. Завантажуємо файл із предметами та темами
    const response = await fetch("../assets/data/subjects_topics.json");
    const subjects = await response.json();

    // 3. Шукаємо предмет із відповідним ID
    const currentSubject = subjects.find((s) => s.id === subjectId);

    if (!currentSubject) {
      titleElement.innerText = "Предмет не знайдено";
      return;
    }

    // 4. Відображаємо назву предмета
    titleElement.innerText = currentSubject.subject_name;

    // 5. Виводимо всі теми цього предмета
    if (currentSubject.topics && currentSubject.topics.length > 0) {
      currentSubject.topics.forEach((topic) => {
        const clone = template.content.cloneNode(true);

        clone.querySelector(".topic-name").innerText = topic.name;

        // Посилання на наступний етап (пакети завдань)
        const link = clone.querySelector(".view-packages-btn");
        link.href = `packages_template_page.html?topic_id=${topic.id}`;

        container.appendChild(clone);
      });
    } else {
      container.innerHTML = "<p>У цього предмета поки немає тем.</p>";
    }
  } catch (error) {
    console.error("Помилка завантаження:", error);
    titleElement.innerText = "Помилка завантаження даних";
  }
}

document.addEventListener("DOMContentLoaded", loadTheoryData);
