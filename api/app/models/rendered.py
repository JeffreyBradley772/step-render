
class RenderedFile(Base):
    __tablename__ = "rendered_files"

    uuid = Column(String(36), primary_key=True, index=True)
    file_name = Column(String, nullable=False)
    blob_url = Column(String, nullable=False)
    part_json = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    