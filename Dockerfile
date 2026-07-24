# Lightweight, reproducible LaTeX compilation container
FROM alpine:3.20

# Install TeX Live packages necessary for compiling standard LaTeX resumes
RUN apk add --no-cache \
    texlive-full \
    bash

WORKDIR /workdir

ENTRYPOINT ["pdflatex", "-interaction=nonstopmode"]
