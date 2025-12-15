import { useState } from "react";
import { createReservationReview, type Reservation, type ReservationReview } from "../services/services";

type Props = {
  reservation: Reservation;
  onReviewSaved: (reservationId: number, review: ReservationReview) => void;
};

const RATING_OPTIONS = [5, 4, 3, 2, 1];

export default function ReservationReviewControls({ reservation, onReviewSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const review = reservation.review ?? null;

  if (!review && reservation.status !== "completed") {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const payloadComment = comment.trim() ? comment.trim() : undefined;
      const saved = await createReservationReview(reservation.id, rating, payloadComment);
      onReviewSaved(reservation.id, saved);
      setOpen(false);
      setRating(5);
      setComment("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (review) {
    return (
      <div className="review-block">
        <div className="review-block__header">
          <span className="muted-small">Tu reseña</span>
          <span className="review-stars">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
        </div>
        {review.comment ? <p className="review-comment">{review.comment}</p> : <p className="muted-small">Sin comentario.</p>}
        <p className="muted-small">Creada el {new Date(review.created_at).toLocaleDateString()}</p>
      </div>
    );
  }

  return (
    <div className="review-block">
      {!open ? (
        <button type="button" className="btn btn--ghost" onClick={() => setOpen(true)}>
          Dejar reseña
        </button>
      ) : (
        <form className="review-form" onSubmit={handleSubmit}>
          <label className="review-form__field">
            <span>Calificación</span>
            <div className="review-rating-options">
              {RATING_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`review-rating-option ${rating === value ? "review-rating-option--active" : ""}`}
                  onClick={() => setRating(value)}
                  disabled={loading}
                >
                  {value}
                </button>
              ))}
            </div>
          </label>
          <label className="review-form__field">
            <span>Comentario (opcional)</span>
            <textarea
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Contá cómo fue tu experiencia"
              disabled={loading}
            />
          </label>
          {error && <p className="review-form__error">{error}</p>}
          <div className="review-form__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? "Enviando…" : "Enviar reseña"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
