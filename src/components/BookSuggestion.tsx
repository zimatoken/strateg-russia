import { useLanguage } from '../context/LanguageContext';
import { getBooksByModule } from '../core/bookRecommendations';

interface BookSuggestionProps {
  moduleId: string;
}

export default function BookSuggestion({ moduleId }: BookSuggestionProps) {
  const { t } = useLanguage();
  const books = getBooksByModule(moduleId);

  return (
    <section className="strateg-books" aria-labelledby={`books-${moduleId}`}>
      <div className="strateg-books-heading">
        <div>
          <span className="strateg-eyebrow">{t('books_title')}</span>
          <h2 id={`books-${moduleId}`}>{t('books_title')}</h2>
        </div>
      </div>
      <div className="strateg-books-grid">
        {books.map((book) => (
          <a className="strateg-book-card" href={book.url} target="_blank" rel="noreferrer" key={book.id}>
            <div className="strateg-book-cover">
              {book.cover ? <img src={book.cover} alt="" loading="lazy" /> : <span>BOOK</span>}
            </div>
            <div className="strateg-book-content">
              <h3>{book.title}</h3>
              <p className="strateg-book-author">{book.author}</p>
              <p>{book.description}</p>
              <span className="strateg-book-link">{t('books_read_more')} <span aria-hidden="true">↗</span></span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}